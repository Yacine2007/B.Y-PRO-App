const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== CONFIGURATION ====================
const BYPRO_API = 'https://b-y-pro-acounts-login.onrender.com/api';
const BYPRO_API_KEY = process.env.BYPRO_INTERNAL_KEY || 'bypro-internal-key-2025';

const JSON_BIN_URL = `https://api.jsonbin.io/v3/b/${process.env.JSON_BIN_ID}`;
const JSON_BIN_HEADERS = {
    'Content-Type': 'application/json',
    'X-Master-Key': process.env.JSON_BIN_MASTER_KEY,
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage() });

// ==================== DEFAULT DATA WITH YOUR REQUESTED SERVICES ====================
const DEFAULT_COMPLETE_DATA = {
    images: [
        { id: 1, imageUrl: 'https://by-pro.kesug.com/banner1.png', alt: 'B.Y PRO Services' },
        { id: 2, imageUrl: 'https://by-pro.kesug.com/banner2.png', alt: 'Digital Solutions' },
        { id: 3, imageUrl: 'https://by-pro.kesug.com/banner3.png', alt: 'Payment System' }
    ],
    news: [
        { id: 1, title: 'Welcome to B.Y PRO App', description: 'Your all-in-one digital services platform', enabled: true, icon: 'fas fa-star', color: '#3b82f6' },
        { id: 2, title: 'New Payment System', description: 'B.Y PRO Pay is now available for seamless transactions', enabled: true, icon: 'fas fa-credit-card', color: '#10b981' }
    ],
    local: [
        { id: 1, name: 'Maintenance & Hardware', description: 'Computer hardware repair and maintenance. Technical troubleshooting and diagnostics. Hardware upgrades and optimization. Network setup and configuration. Preventive maintenance services.', imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600&auto=format', enabled: true },
        { id: 2, name: 'Document Services', description: 'Printing, copying, scanning, and document binding. Official document translation.', imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&auto=format', enabled: true }
    ],
    phone: [
        { id: 1, name: 'Local Recharge Services - Algeria', description: 'Mobile phone recharge for Mobilis, Djezzy, Ooredoo. Fast and secure.', imageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&auto=format', enabled: true },
        { id: 2, name: 'Flexy-Li Remote Recharge', description: 'Flexy-Li platform for remote mobile recharge and bill payments.', imageUrl: 'https://by-pro.kesug.com/Flexy-Li%20Alg/favicon.png', enabled: true, link: 'https://by-pro.kesug.com/Flexy-Li%20Alg/' }
    ],
    digital: [
        { id: 1, name: 'Programming & Development', description: 'Custom software application development. Website and e-commerce solutions. Mobile applications (iOS & Android). Telegram bot development and automation. AI solutions and intelligent systems. System integration and API development. Chatbot development with AI capabilities. Payment processing systems. Notification and alert systems.', imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format', enabled: true },
        { id: 2, name: 'Design & Graphics', description: 'Logo design and brand identity. UI/UX design for applications and websites. Graphic design for print and digital media. Marketing materials and advertising design. 3D modeling and animation.', imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&auto=format', enabled: true },
        { id: 3, name: 'Editing & Montage', description: 'Professional video editing and montage. Audio editing and sound design. Motion graphics and visual effects. Color correction and grading. Voiceover recording and editing.', imageUrl: 'https://images.pexels.com/photos/257904/pexels-photo-257904.jpeg?w=600&auto=format', enabled: true },
        { id: 4, name: 'Marketing & Digital Brokerage', description: 'Social media followers and engagement growth. Digital marketing campaigns. Influencer marketing and collaborations. Content marketing strategy. Brand awareness and reputation management. Marketing of digital products and services. Account brokerage and management services. Digital asset trading and brokerage. Partnership and collaboration facilitation.', imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&auto=format', enabled: true },
        { id: 5, name: 'Cyber & Internet Services', description: 'Internet browsing and research services. Document printing, copying, and editing. Online form filling and submissions. Email setup and management. Digital registration and online transactions.', imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format', enabled: true }
    ],
    products: [
        { id: 1, name: 'B.Y PRO Digital Card', description: 'Prepaid digital card for online payments.', imageUrl: 'https://by-pro.kesug.com/App.png?v=3', enabled: true, link: 'https://by-pro.kesug.com' },
        { id: 2, name: 'Premium Subscription', description: 'Access all premium services.', imageUrl: 'https://placehold.co/400x200/3b82f6/white?text=Premium', enabled: true, link: 'https://by-pro.kesug.com' }
    ],
    social: [
        { id: 1, name: 'Facebook', icon: 'fab fa-facebook-f', color: '#1877f2', url: 'https://www.facebook.com/bypro2007', order: 0 },
        { id: 2, name: 'Telegram', icon: 'fab fa-telegram', color: '#26A5E4', url: 'https://t.me/ycnbnmkrn', order: 1 },
        { id: 3, name: 'TikTok', icon: 'fab fa-tiktok', color: '#000000', url: 'https://tiktok.com/@b.yprotiktok', order: 2 },
        { id: 4, name: 'WhatsApp', icon: 'fab fa-whatsapp', color: '#25D366', url: 'https://wa.me/213795082763', order: 3 },
        { id: 5, name: 'YouTube', icon: 'fab fa-youtube', color: '#FF0000', url: 'https://www.youtube.com/@technoYT2024', order: 4 },
        { id: 6, name: 'Instagram', icon: 'fab fa-instagram', color: '#E4405F', url: 'https://www.instagram.com/yacine20072025', order: 5 },
        { id: 7, name: 'Marketing Agent', icon: 'fab fa-facebook-messenger', color: '#0084ff', url: 'https://www.facebook.com/profile.php?id=61561793138138', order: 6, imageUrl: 'https://github.com/Yacine2007/-by_pro_marketing_agent/blob/main/MA.jpg?raw=true' }
    ],
    support: [],
    notifications: [],
    squareGroups: [
        { 
            id: 1, 
            cards: [
                { id: 1, name: 'B.Y PRO Card', link: 'https://by-pro.kesug.com', imageUrl: 'https://by-pro.kesug.com/App.png?v=3', active: true },
                { id: 2, name: 'Store PRO', link: 'https://store-pro.great-site.net', imageUrl: 'https://store-pro.great-site.net/favicon.png', active: true }
            ] 
        }
    ],
    nextId: { img: 4, news: 3, digital: 6, local: 3, phone: 3, product: 3, social: 8, support: 1, squareCard: 3, squareGroup: 2 }
};

// ==================== LOCAL CACHE ====================
let cachedData = null;
let lastFetch = 0;
const CACHE_TTL = 30000;

async function fetchLocalData() {
    const now = Date.now();
    if (cachedData && (now - lastFetch) < CACHE_TTL) return cachedData;
    
    // If JSON_BIN_ID is not configured, return default data directly
    if (!process.env.JSON_BIN_ID || !process.env.JSON_BIN_MASTER_KEY) {
        console.log('⚠️ JSONBin not configured, using default data');
        cachedData = { ...DEFAULT_COMPLETE_DATA };
        lastFetch = now;
        return cachedData;
    }
    
    try {
        const response = await axios.get(JSON_BIN_URL, {
            headers: { 'X-Master-Key': process.env.JSON_BIN_MASTER_KEY }
        });
        const rawData = response.data.record;
        // Merge with defaults, but don't overwrite existing data
        cachedData = { ...DEFAULT_COMPLETE_DATA, ...rawData };
        // Ensure arrays exist
        cachedData.images = cachedData.images || DEFAULT_COMPLETE_DATA.images;
        cachedData.news = cachedData.news || DEFAULT_COMPLETE_DATA.news;
        cachedData.digital = cachedData.digital || DEFAULT_COMPLETE_DATA.digital;
        cachedData.local = cachedData.local || DEFAULT_COMPLETE_DATA.local;
        cachedData.phone = cachedData.phone || DEFAULT_COMPLETE_DATA.phone;
        cachedData.products = cachedData.products || DEFAULT_COMPLETE_DATA.products;
        cachedData.social = cachedData.social || DEFAULT_COMPLETE_DATA.social;
        cachedData.squareGroups = cachedData.squareGroups || DEFAULT_COMPLETE_DATA.squareGroups;
        if (!cachedData.nextId) cachedData.nextId = DEFAULT_COMPLETE_DATA.nextId;
        lastFetch = now;
        return cachedData;
    } catch (error) {
        console.error('Error fetching local data:', error.message);
        console.log('⚠️ Using default data due to error');
        return { ...DEFAULT_COMPLETE_DATA };
    }
}

async function saveLocalData(data) {
    if (!process.env.JSON_BIN_ID || !process.env.JSON_BIN_MASTER_KEY) {
        console.log('⚠️ JSONBin not configured, data saved to memory only');
        cachedData = data;
        lastFetch = Date.now();
        return { success: true };
    }
    try {
        const response = await axios.put(JSON_BIN_URL, data, { headers: JSON_BIN_HEADERS });
        cachedData = data;
        lastFetch = Date.now();
        return response.data;
    } catch (error) {
        console.error('Error saving local data:', error.message);
        throw error;
    }
}

// ==================== B.Y PRO FINANCIAL API HELPERS ====================
async function getFinancialData(userId) {
    try {
        const response = await axios.get(`${BYPRO_API}/financial/${userId}`, { timeout: 10000 });
        return response.data;
    } catch (error) {
        console.error(`Error fetching financial data for ${userId}:`, error.message);
        if (error.response?.status === 404) return { success: false, error: 'User not found' };
        return { success: false, error: error.message };
    }
}

async function syncUserFinancialData(userId, name, email) {
    try {
        const response = await axios.post(`${BYPRO_API}/financial/sync`, { userId, name, email },
            { headers: { 'x-api-key': BYPRO_API_KEY }, timeout: 10000 });
        return response.data;
    } catch (error) {
        console.error(`Error syncing financial data for ${userId}:`, error.message);
        return { success: false, error: error.message };
    }
}

async function addBalanceToUser(userId, amount, description) {
    try {
        const response = await axios.post(`${BYPRO_API}/financial/add-balance`, { userId, amount, description },
            { headers: { 'x-api-key': BYPRO_API_KEY }, timeout: 10000 });
        return response.data;
    } catch (error) {
        console.error(`Error adding balance to ${userId}:`, error.message);
        return { success: false, error: error.message };
    }
}

async function verifyUserPassword(accountId, password) {
    try {
        const response = await axios.post(`${BYPRO_API}/verify-password`, { accountId, password }, { timeout: 10000 });
        return response.data;
    } catch (error) {
        console.error(`Error verifying password for ${accountId}:`, error.message);
        return { success: false, error: error.message };
    }
}

async function findCardByCode(cardCode) {
    try {
        const response = await axios.post(`${BYPRO_API}/find-card`, { cardCode }, { timeout: 10000 });
        return response.data;
    } catch (error) {
        console.error(`Error finding card ${cardCode}:`, error.message);
        return { success: false, error: error.message };
    }
}

async function processPayment(paymentData) {
    try {
        const response = await axios.post(`${BYPRO_API}/process-payment`, paymentData,
            { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
        return response.data;
    } catch (error) {
        console.error('Error processing payment:', error.message);
        return { success: false, error: error.message };
    }
}

async function createPaymentRequest(appName, amount, callbackUrl, description) {
    try {
        const response = await axios.post(`${BYPRO_API}/create-payment`, { appName, amount, callbackUrl, description }, { timeout: 10000 });
        return response.data;
    } catch (error) {
        console.error('Error creating payment:', error.message);
        return { success: false, error: error.message };
    }
}

// ==================== SSE Clients ====================
let clients = [];
let lastBroadcastTime = 0;
const BROADCAST_COOLDOWN = 2000;

function broadcastUpdate(type, data) {
    if (type === 'data_update') {
        const now = Date.now();
        if ((now - lastBroadcastTime) < BROADCAST_COOLDOWN) {
            console.log(`⏸️ Skipping rapid broadcast (${type}), cooldown active`);
            return;
        }
        lastBroadcastTime = now;
    }
    
    console.log(`📢 Broadcasting ${type} to ${clients.length} clients`);
    clients.forEach(client => {
        try {
            client.res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
        } catch (err) {
            console.error(`Error sending to client ${client.id}:`, err.message);
        }
    });
}

// ==================== SSE Endpoint ====================
app.get('/api/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    
    const clientId = Date.now();
    const newClient = { id: clientId, res };
    clients.push(newClient);
    
    console.log(`✅ New SSE client connected: ${clientId}, Total clients: ${clients.length}`);
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to server', clientId })}\n\n`);
    
    const pingInterval = setInterval(() => {
        try {
            res.write(`: ping\n\n`);
        } catch (err) {
            clearInterval(pingInterval);
        }
    }, 30000);
    
    req.on('close', () => {
        clearInterval(pingInterval);
        clients = clients.filter(client => client.id !== clientId);
        console.log(`❌ SSE client disconnected: ${clientId}, Total clients: ${clients.length}`);
    });
});

// ==================== FINANCIAL ENDPOINTS ====================
app.get('/api/financial/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await getFinancialData(userId);
        if (result.success) res.json(result);
        else res.status(404).json({ success: false, error: result.error || 'User not found' });
    } catch (error) {
        console.error('Error in /api/financial/:userId:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/financial/sync', async (req, res) => {
    try {
        const { userId, name, email } = req.body;
        const result = await syncUserFinancialData(userId, name, email);
        res.json(result);
    } catch (error) {
        console.error('Error in /api/financial/sync:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/financial/add-balance', async (req, res) => {
    try {
        const { userId, amount, description } = req.body;
        const apiKey = req.headers['x-api-key'];
        if (apiKey !== BYPRO_API_KEY) return res.status(403).json({ success: false, error: 'Access denied' });
        const result = await addBalanceToUser(userId, amount, description);
        res.json(result);
    } catch (error) {
        console.error('Error in /api/financial/add-balance:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/verify-password', async (req, res) => {
    try {
        const { accountId, password } = req.body;
        const result = await verifyUserPassword(accountId, password);
        res.json(result);
    } catch (error) {
        console.error('Error in /api/verify-password:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/find-card', async (req, res) => {
    try {
        const { cardCode } = req.body;
        const result = await findCardByCode(cardCode);
        res.json(result);
    } catch (error) {
        console.error('Error in /api/find-card:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/create-payment', async (req, res) => {
    try {
        const { appName, amount, callbackUrl, description } = req.body;
        const result = await createPaymentRequest(appName, amount, callbackUrl, description);
        res.json(result);
    } catch (error) {
        console.error('Error in /api/create-payment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/process-payment', async (req, res) => {
    try {
        const paymentData = req.body;
        const result = await processPayment(paymentData);
        if (result.success) {
            broadcastUpdate('payment_completed', {
                accountId: paymentData.accountId,
                amount: paymentData.amount,
                newBalance: result.newBalance,
                description: paymentData.description,
                transactionId: result.transactionId,
                timestamp: new Date().toISOString()
            });
        }
        res.json(result);
    } catch (error) {
        console.error('Error in /api/process-payment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== LOCAL DATA ENDPOINTS ====================
app.get('/api/data', async (req, res) => {
    try {
        const data = await fetchLocalData();
        res.json(data);
    } catch (error) {
        console.error('Error fetching local data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.put('/api/data', async (req, res) => {
    try {
        await saveLocalData(req.body);
        broadcastUpdate('data_update', { timestamp: Date.now(), message: 'Data updated' });
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving local data:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

app.get('/api/square-groups', async (req, res) => {
    try {
        const data = await fetchLocalData();
        res.json(data.squareGroups || []);
    } catch (error) {
        console.error('Error fetching square groups:', error);
        res.status(500).json({ error: 'Failed to fetch square groups' });
    }
});

app.put('/api/square-groups', async (req, res) => {
    try {
        const currentData = await fetchLocalData();
        currentData.squareGroups = req.body;
        await saveLocalData(currentData);
        broadcastUpdate('data_update', { type: 'square_groups', timestamp: Date.now() });
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving square groups:', error);
        res.status(500).json({ error: 'Failed to save square groups' });
    }
});

// ==================== SUPPORT & NOTIFICATIONS ====================
app.post('/api/support', async (req, res) => {
    try {
        const newMessage = req.body;
        newMessage.date = new Date().toISOString();
        newMessage.id = Date.now();
        newMessage.read = false;
        newMessage.replied = false;
        
        const currentData = await fetchLocalData();
        const support = currentData.support || [];
        support.unshift(newMessage);
        currentData.support = support;
        await saveLocalData(currentData);
        
        broadcastUpdate('support_new', {
            id: newMessage.id,
            sender: newMessage.sender,
            subject: newMessage.subject,
            message: newMessage.details,
            date: newMessage.date
        });
        
        console.log(`📨 New support message from ${newMessage.sender}`);
        res.json({ success: true, message: 'Support request received' });
    } catch (error) {
        console.error('Support error:', error);
        res.status(500).json({ error: 'Failed to save support message' });
    }
});

app.post('/api/support/reply', async (req, res) => {
    try {
        const { messageId, recipient, subject, replyMessage } = req.body;
        if (!messageId || !recipient || !replyMessage) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const currentData = await fetchLocalData();
        const replyNotification = {
            id: Date.now(),
            title: `Reply to: ${subject}`,
            message: replyMessage,
            icon: 'fas fa-reply',
            color: '#10b981',
            date: new Date().toISOString(),
            read: false,
            recipient: recipient,
            type: 'support_reply'
        };
        
        const notifications = currentData.notifications || [];
        notifications.unshift(replyNotification);
        currentData.notifications = notifications;
        
        const support = currentData.support || [];
        const originalMessage = support.find(m => m.id === parseInt(messageId));
        if (originalMessage) {
            originalMessage.replied = true;
            originalMessage.replyDate = new Date().toISOString();
            originalMessage.replyMessage = replyMessage;
        }
        
        await saveLocalData(currentData);
        
        broadcastUpdate('support_reply', {
            id: replyNotification.id,
            message: replyMessage,
            subject: subject,
            recipient: recipient,
            sender: 'Admin',
            date: new Date().toISOString()
        });
        
        broadcastUpdate('notification_new', {
            id: replyNotification.id,
            title: replyNotification.title,
            message: replyNotification.message,
            icon: replyNotification.icon,
            color: replyNotification.color,
            recipient: recipient
        });
        
        console.log(`📧 Reply sent to ${recipient} about: ${subject}`);
        res.json({ success: true, message: 'Reply sent successfully', notification: replyNotification });
    } catch (error) {
        console.error('Reply error:', error);
        res.status(500).json({ error: 'Failed to send reply' });
    }
});

app.post('/api/support/read/:id', async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);
        const currentData = await fetchLocalData();
        const support = currentData.support || [];
        const message = support.find(m => m.id === messageId);
        if (message) {
            message.read = true;
            await saveLocalData(currentData);
            broadcastUpdate('support_read', { id: messageId });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ error: 'Failed to update message' });
    }
});

app.post('/api/notifications', async (req, res) => {
    try {
        const { title, message, icon, color, recipient } = req.body;
        const newNotification = {
            id: Date.now(),
            title,
            message,
            icon: icon || 'fas fa-bell',
            color: color || '#3b82f6',
            date: new Date().toISOString(),
            read: false,
            recipient: recipient || 'all'
        };
        
        const currentData = await fetchLocalData();
        const notifications = currentData.notifications || [];
        notifications.unshift(newNotification);
        currentData.notifications = notifications;
        await saveLocalData(currentData);
        
        broadcastUpdate('notification_new', {
            id: newNotification.id,
            title: newNotification.title,
            message: newNotification.message,
            icon: newNotification.icon,
            color: newNotification.color,
            recipient: newNotification.recipient,
            date: newNotification.date
        });
        
        console.log(`🔔 Notification sent: ${title} to ${recipient || 'all'}`);
        res.json({ success: true, notification: newNotification });
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

app.post('/api/notifications/read/:id', async (req, res) => {
    try {
        const notifId = parseInt(req.params.id);
        const currentData = await fetchLocalData();
        const notifications = currentData.notifications || [];
        const notification = notifications.find(n => n.id === notifId);
        if (notification) {
            notification.read = true;
            await saveLocalData(currentData);
            broadcastUpdate('notification_read', { id: notifId });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

app.get('/api/unread-counts', async (req, res) => {
    try {
        const currentData = await fetchLocalData();
        const support = currentData.support || [];
        const notifications = currentData.notifications || [];
        res.json({
            support_unread: support.filter(m => !m.read).length,
            notifications_unread: notifications.filter(n => !n.read).length
        });
    } catch (error) {
        console.error('Error getting unread counts:', error);
        res.status(500).json({ error: 'Failed to get counts' });
    }
});

// ==================== IMAGE UPLOAD ====================
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        console.log('Uploading image:', req.file.originalname, 'Size:', req.file.size);
        
        const base64Image = req.file.buffer.toString('base64');
        const formData = new FormData();
        formData.append('key', process.env.IMGBB_API_KEY);
        formData.append('image', base64Image);
        
        const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
            headers: { ...formData.getHeaders(), 'Accept': 'application/json' },
            timeout: 30000
        });
        
        if (response.data && response.data.success && response.data.data && response.data.data.url) {
            console.log('Image uploaded successfully:', response.data.data.url);
            res.json({ url: response.data.data.url });
        } else {
            console.error('ImgBB upload failed:', response.data);
            res.status(500).json({ error: 'Upload failed: Invalid response from ImgBB' });
        }
    } catch (error) {
        console.error('Upload error:', error.message);
        res.status(500).json({ error: 'Upload failed: ' + error.message });
    }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        clients: clients.length,
        uptime: process.uptime(),
        bypro_server: BYPRO_API,
        financial_integration: 'active'
    });
});

// ==================== SERVE STATIC FILES - SPA FALLBACK ====================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== START SERVER ====================
app.listen(PORT, async () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🖼️  ImgBB API Key: ${process.env.IMGBB_API_KEY ? '✓ Configured' : '✗ Missing (uploads may fail)'}`);
    console.log(`💾 Local JSON Bin: ${process.env.JSON_BIN_ID ? '✓ Configured' : '✗ Missing (using memory storage)'}`);
    console.log(`🔗 B.Y PRO Server: ${BYPRO_API}`);
    console.log(`📡 SSE endpoint: /api/events`);
    console.log(`💰 Financial endpoints: /api/financial/*`);
    console.log(`📦 Square groups endpoint: /api/square-groups`);
    
    // Initialize data cache
    await fetchLocalData();
    console.log('✅ Default data loaded with all requested services');
});
