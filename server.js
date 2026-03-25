const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const axios = require('axios');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting B.Y PRO Accounts System v8.0 (MongoDB Edition)');

// ==================== ENVIRONMENT VARIABLES ====================
const {
  MONGODB_URI,
  MONGODB_DB = 'bypro',
  BREVO_SMTP_HOST = 'smtp-relay.brevo.com',
  BREVO_SMTP_PORT = 587,
  BREVO_SMTP_USER,
  BREVO_SMTP_KEY,
  INTERNAL_API_KEY = 'bypro-internal-key-2025',
  ALLOWED_ORIGINS = 'https://yacine2007.github.io,http://localhost:5500,http://localhost:3000,https://b-y-pro-acounts-login.onrender.com,http://localhost:5000',
  NODE_ENV = 'production'
} = process.env;

if (!MONGODB_URI) {
  console.error('❌ FATAL: MONGODB_URI is not set');
  process.exit(1);
}

// ==================== MONGODB CONNECTION ====================
let db = null;
let usersCollection = null;
let paymentsCollection = null;

async function connectMongoDB() {
  try {
    const client = new MongoClient(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    await client.connect();
    db = client.db(MONGODB_DB);
    usersCollection = db.collection('users');
    paymentsCollection = db.collection('payments');
    
    // Create indexes
    await usersCollection.createIndex({ id: 1 }, { unique: true });
    await usersCollection.createIndex({ cardCode: 1 });
    await paymentsCollection.createIndex({ paymentId: 1 });
    await paymentsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    
    console.log('✅ MongoDB connected');
    
    // Create default users
    await createDefaultUsers();
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function createDefaultUsers() {
  // Check if users exist
  const userCount = await usersCollection.countDocuments();
  if (userCount > 0) {
    console.log(`📊 ${userCount} users already exist in database`);
    return;
  }
  
  console.log('🆕 Creating default users...');
  
  // User 1 - Yacine (with $15,000 balance)
  await usersCollection.insertOne({
    id: '1',
    name: 'Yacine',
    email: 'yassinebenmokran@gmail.com',
    balance: 15000,
    cardCode: 'byppcn-984239855685554',
    transactions: [
      {
        type: 'deposit',
        amount: 15000,
        description: 'Initial balance',
        date: new Date().toISOString()
      }
    ],
    createdAt: new Date().toISOString()
  });
  console.log('   ✅ User 1 created: Yacine - $15,000');
  
  // User 0 - Test User
  await usersCollection.insertOne({
    id: '0',
    name: 'Test User 0',
    email: 'test0@bypro.com',
    balance: 0,
    cardCode: 'byppcn-000000000000000',
    transactions: [],
    createdAt: new Date().toISOString()
  });
  console.log('   ✅ User 0 created: Test User 0 - $0');
  
  console.log('✅ Default users created successfully');
}

// ==================== MONGODB HELPER FUNCTIONS ====================
async function getUserById(userId) {
  return await usersCollection.findOne({ id: userId });
}

async function getUserByCardCode(cardCode) {
  return await usersCollection.findOne({ cardCode: cardCode });
}

async function getAllUsers() {
  return await usersCollection.find({}).toArray();
}

async function updateUserBalance(userId, newBalance, transaction) {
  return await usersCollection.updateOne(
    { id: userId },
    {
      $set: { balance: newBalance },
      $push: { transactions: { $each: [transaction], $position: 0 } }
    }
  );
}

async function createPayment(paymentData) {
  return await paymentsCollection.insertOne(paymentData);
}

async function getPayment(paymentId) {
  return await paymentsCollection.findOne({ paymentId: paymentId });
}

async function updatePaymentStatus(paymentId, status, accountId) {
  return await paymentsCollection.updateOne(
    { paymentId: paymentId },
    { 
      $set: { 
        status: status, 
        completedAt: new Date().toISOString(), 
        accountId: accountId 
      } 
    }
  );
}

function generateUniqueCardCode() {
  const randomDigits = Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
  return `byppcn-${randomDigits}`;
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function generateQR(data) {
  try {
    const qr = await QRCode.toDataURL(data, { width: 200, margin: 2, errorCorrectionLevel: 'H' });
    return { success: true, qrCode: qr };
  } catch {
    return { success: false };
  }
}

// ==================== CORS ====================
const allowedOrigins = ALLOWED_ORIGINS.split(',').map(o => o.trim());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || origin?.startsWith('http://localhost')) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, x-api-key');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
  }
  next();
});

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost')) {
      callback(null, true);
    } else {
      callback(new Error('CORS blocked'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// ==================== BREVO SMTP ====================
let brevoTransporter = null;

function createBrevoTransporter() {
  return nodemailer.createTransport({
    host: BREVO_SMTP_HOST,
    port: parseInt(BREVO_SMTP_PORT),
    secure: false,
    auth: { user: BREVO_SMTP_USER, pass: BREVO_SMTP_KEY },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000
  });
}

function initializeBrevo() {
  try {
    brevoTransporter = createBrevoTransporter();
    brevoTransporter.verify((error) => {
      if (error) console.log('⚠️ Brevo error:', error.message);
      else console.log('✅ Brevo SMTP ready');
    });
  } catch (error) {
    console.error('❌ Brevo init error:', error.message);
  }
}
initializeBrevo();

async function sendOTPviaBrevo(email, otpCode) {
  try {
    if (!brevoTransporter) brevoTransporter = createBrevoTransporter();
    const mailOptions = {
      from: `"B.Y PRO" <${BREVO_SMTP_USER}>`,
      to: email,
      subject: 'B.Y PRO - Verification Code',
      html: `
        <div style="font-family:Arial;max-width:600px;margin:0 auto;background:#f5f5f5;padding:20px;">
          <div style="background:linear-gradient(135deg,#3498db,#2980b9);padding:30px;text-align:center;color:white;border-radius:10px 10px 0 0;">
            <h1>B.Y PRO Accounts</h1>
          </div>
          <div style="background:white;padding:30px;border-radius:0 0 10px 10px;">
            <h2>Verification Code</h2>
            <div style="background:linear-gradient(135deg,#3498db,#2980b9);color:white;padding:20px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;margin:25px 0;border-radius:8px;">${otpCode}</div>
            <p>This code expires in 10 minutes.</p>
          </div>
        </div>
      `,
      text: `Your B.Y PRO verification code is: ${otpCode}. Expires in 10 minutes.`
    };
    await brevoTransporter.sendMail(mailOptions);
    console.log(`✅ Email sent to: ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Email failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ==================== TEMPORARY OTP STORAGE (in-memory for now) ====================
const otpStorage = new Map();

async function storeOTP(email, otp) {
  otpStorage.set(email, {
    otp: otp,
    expires: Date.now() + 10 * 60 * 1000,
    attempts: 0
  });
  return true;
}

async function verifyOTP(email, code) {
  const record = otpStorage.get(email);
  if (!record) return { success: false, error: "No code found" };
  if (Date.now() > record.expires) {
    otpStorage.delete(email);
    return { success: false, error: "Code expired" };
  }
  if (record.otp === code) {
    otpStorage.delete(email);
    return { success: true };
  }
  return { success: false, error: "Invalid code" };
}

// ==================== ACCOUNT FUNCTIONS ====================
async function verifyAccountCredentials(id, password) {
  // For demo purposes, accept hardcoded password for user 1
  // In production, this would check against Google Drive or another auth system
  if (id === '1' && password === 'ABC123!?') {
    const user = await getUserById('1');
    if (user) {
      return {
        success: true,
        account: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      };
    }
  }
  
  // Check if user exists in MongoDB
  const user = await getUserById(id);
  if (user) {
    // For demo, accept any password for other users
    return {
      success: true,
      account: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    };
  }
  
  return { success: false, error: "Invalid credentials" };
}

// ==================== PAYMENT GATEWAY ENDPOINTS ====================
app.post('/api/create-payment', async (req, res) => {
  try {
    const { appName, amount, callbackUrl, description } = req.body;
    
    if (!appName || !appName.startsWith('@byproapp:')) {
      return res.status(400).json({ success: false, error: "Invalid appName. Must start with @byproapp:" });
    }
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0 || amountNum > 1000) {
      return res.status(400).json({ success: false, error: "Amount must be between 1 and 1000" });
    }
    
    const paymentId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    
    await createPayment({
      paymentId: paymentId,
      appName: appName,
      amount: amountNum,
      callbackUrl: callbackUrl,
      description: description || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt
    });
    
    res.json({
      success: true,
      paymentId: paymentId,
      gatewayUrl: `https://b-y-pro-acounts-login.onrender.com/Payment%20gateway.html?payment_id=${paymentId}`,
      amount: amountNum,
      expiresIn: 1800
    });
  } catch (error) {
    console.error('❌ create-payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/get-payment-info', async (req, res) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) return res.status(400).json({ success: false, error: "paymentId required" });
    
    const payment = await getPayment(paymentId);
    if (!payment) return res.status(404).json({ success: false, error: "Payment not found" });
    if (new Date(payment.expiresAt) < new Date()) {
      return res.status(410).json({ success: false, error: "Payment expired" });
    }
    
    res.json({
      success: true,
      amount: payment.amount,
      appName: payment.appName,
      description: payment.description,
      callbackUrl: payment.callbackUrl,
      status: payment.status
    });
  } catch (error) {
    console.error('❌ get-payment-info error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/find-card', async (req, res) => {
  try {
    const { cardCode } = req.body;
    if (!cardCode || !cardCode.startsWith('byppcn-')) {
      return res.status(400).json({ success: false, error: "Invalid card code format" });
    }
    
    const user = await getUserByCardCode(cardCode);
    if (!user) return res.status(404).json({ success: false, error: "Card not found" });
    
    res.json({
      success: true,
      accountId: user.id,
      userData: {
        id: user.id,
        name: user.name,
        balance: user.balance,
        cardCode: user.cardCode
      }
    });
  } catch (error) {
    console.error('❌ find-card error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/verify-password', async (req, res) => {
  try {
    const { accountId, password } = req.body;
    if (!accountId || !password) {
      return res.status(400).json({ success: false, error: "accountId and password required" });
    }
    
    const result = await verifyAccountCredentials(accountId, password);
    res.json(result);
  } catch (error) {
    console.error('❌ verify-password error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/process-payment', async (req, res) => {
  try {
    const { accountId, cardCode, amount, paymentId, appName, description } = req.body;
    if (!accountId || !cardCode || !amount || !paymentId || !appName) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }
    
    const payment = await getPayment(paymentId);
    if (!payment) return res.status(404).json({ success: false, error: "Payment not found" });
    if (payment.status !== 'pending') {
      return res.status(400).json({ success: false, error: "Payment already processed" });
    }
    if (new Date(payment.expiresAt) < new Date()) {
      return res.status(410).json({ success: false, error: "Payment expired" });
    }
    
    const user = await getUserByCardCode(cardCode);
    if (!user || user.id !== accountId) {
      return res.status(400).json({ success: false, error: "Invalid account or card" });
    }
    
    const amountNum = parseFloat(amount);
    if (user.balance < amountNum) {
      return res.status(402).json({ success: false, error: "Insufficient balance" });
    }
    
    const newBalance = user.balance - amountNum;
    const transaction = {
      type: 'payment',
      amount: amountNum,
      appName: appName,
      paymentId: paymentId,
      date: new Date().toISOString(),
      description: description || payment.description || `Payment to ${appName}`
    };
    
    await updateUserBalance(accountId, newBalance, transaction);
    await updatePaymentStatus(paymentId, 'completed', accountId);
    
    if (payment.callbackUrl) {
      const callbackData = {
        paymentId,
        success: true,
        accountId,
        amount: amountNum,
        transactionId: `txn_${Date.now()}`,
        timestamp: new Date().toISOString(),
        description: transaction.description
      };
      axios.post(payment.callbackUrl, callbackData, { timeout: 5000 }).catch(e => console.log('Callback failed:', e.message));
    }
    
    res.json({
      success: true,
      newBalance: newBalance,
      transactionId: `txn_${Date.now()}`,
      transaction
    });
  } catch (error) {
    console.error('❌ process-payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== FINANCIAL ENDPOINTS ====================
app.get('/api/financial/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    
    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: user.balance,
        cardCode: user.cardCode,
        transactions: user.transactions || []
      }
    });
  } catch (error) {
    console.error('❌ Error fetching financial data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/financial/all', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== INTERNAL_API_KEY) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    const users = await getAllUsers();
    res.json({
      success: true,
      count: users.length,
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        balance: u.balance,
        cardCode: u.cardCode
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching all users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/financial/add-balance', async (req, res) => {
  try {
    const { userId, amount, description } = req.body;
    const apiKey = req.headers['x-api-key'];
    
    if (apiKey !== INTERNAL_API_KEY) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    
    const amountNum = parseFloat(amount);
    const newBalance = user.balance + amountNum;
    const transaction = {
      type: 'deposit',
      amount: amountNum,
      description: description || 'Admin deposit',
      date: new Date().toISOString()
    };
    
    await updateUserBalance(userId, newBalance, transaction);
    
    res.json({
      success: true,
      newBalance: newBalance
    });
  } catch (error) {
    console.error('❌ Error adding balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== AUTH ROUTES ====================
app.post('/api/verify-account', async (req, res) => {
  try {
    const { id, password } = req.body;
    if (!id || !password) return res.json({ success: false, error: "ID and password required" });
    const result = await verifyAccountCredentials(id, password);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: "Service unavailable" });
  }
});

app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: "Valid email required" });
    }
    const otp = generateOTP();
    await storeOTP(email, otp);
    const result = await sendOTPviaBrevo(email, otp);
    if (result.success) {
      res.json({ success: true, message: "Code sent", expiresIn: "10 minutes" });
    } else {
      res.status(500).json({ success: false, error: "Email service unavailable" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, error: "Email and code required" });
    const result = await verifyOTP(email, otp);
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/create-account', async (req, res) => {
  try {
    const { id, name, email, password, otpCode } = req.body;
    
    if (!id || !name || !email || !password || !otpCode) {
      return res.status(400).json({ success: false, error: "All fields required" });
    }
    
    const otpResult = await verifyOTP(email, otpCode);
    if (!otpResult.success) {
      return res.status(400).json({ success: false, error: otpResult.error });
    }
    
    const existingUser = await getUserById(id);
    if (existingUser) {
      return res.status(400).json({ success: false, error: "User ID already exists" });
    }
    
    const cardCode = generateUniqueCardCode();
    
    const newUser = {
      id: id.toString(),
      name: name,
      email: email,
      balance: 0,
      cardCode: cardCode,
      transactions: [],
      createdAt: new Date().toISOString()
    };
    
    await usersCollection.insertOne(newUser);
    
    const qrResult = await generateQR(`BYPRO:${id}:${password}`);
    
    res.json({
      success: true,
      message: "Account created successfully",
      account: { id: id.toString(), name, email },
      financialAccount: {
        cardCode: cardCode,
        balance: 0
      },
      qrCode: qrResult.qrCode
    });
    
  } catch (error) {
    console.error('❌ Error creating account:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== HEALTH & PING ====================
app.get('/api/ping', (req, res) => {
  res.json({ success: true, time: Date.now(), status: 'awake' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'B.Y PRO v8.0',
    database: 'MongoDB',
    email_provider: 'Brevo SMTP',
    payment_gateway: 'active',
    timestamp: new Date().toISOString()
  });
});

// ==================== STATIC PAGES ====================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/Payment%20gateway.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Payment gateway.html'));
});

app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: "Not found" });
});

// ==================== KEEP-ALIVE ====================
setInterval(async () => {
  try {
    await axios.get(`http://localhost:${PORT}/api/ping`, { timeout: 5000 });
    console.log('💓 Keep-alive ping');
  } catch (e) {}
}, 120000);

// ==================== START SERVER ====================
async function startServer() {
  await connectMongoDB();
  
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🎉 =================================');
    console.log('🚀 B.Y PRO ACCOUNTS v8.0 (MongoDB)');
    console.log('✅ CORS: ENABLED');
    console.log('✅ Database: MongoDB');
    console.log('✅ Email: BREVO SMTP');
    console.log('✅ Keep-Alive: ACTIVE');
    console.log('✅ Payment Gateway: ACTIVE');
    console.log(`✅ Server: http://localhost:${PORT}`);
    console.log('🎉 =================================\n');
  });
  
  server.timeout = 30000;
  server.keepAliveTimeout = 30000;
}

startServer();
