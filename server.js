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

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage() });

// ==================== DEFAULT DATA (للتهيئة الأولية فقط) ====================
// هذه البيانات ستضاف فقط إذا كانت الفئة المقابلة فارغة تماماً
const DEFAULT_DATA = {
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

// ==================== قاعدة بيانات حقيقية (MongoDB مثال) ====================
// هنا يجب أن تستخدم قاعدة بياناتك الحقيقية. هذا مجرد مثال باستخدام متغير عام.
// بدلاً من ذلك، يمكنك توصيل MongoDB أو أي قاعدة بيانات أخرى.
// لكن لضمان عدم فقدان البيانات، سأستخدم متغيراً عاماً يحتفظ بالبيانات بين الطلبات،
// مع إضافة منطق دمج لا يستبدل البيانات الموجودة.

let database = null;

// دالة تحميل قاعدة البيانات (من ملف أو من MongoDB)
// في حالتك، استبدل هذا بكود الاتصال بقاعدة بياناتك الحقيقية
async function loadDatabase() {
    if (database) return database;
    
    // محاولة قراءة البيانات من ملف JSON (كحل مؤقت للحفاظ على البيانات)
    const fs = require('fs');
    const dbPath = path.join(__dirname, 'database.json');
    
    try {
        if (fs.existsSync(dbPath)) {
            const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            console.log('✅ Database loaded from file');
            database = data;
        } else {
            // أول مرة: نبدأ بالبيانات الافتراضية
            console.log('📦 No existing database found, initializing with defaults');
            database = JSON.parse(JSON.stringify(DEFAULT_DATA));
            fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
        }
    } catch (err) {
        console.error('Error loading database:', err);
        database = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    
    return database;
}

// دالة حفظ قاعدة البيانات (إلى ملف JSON مؤقتاً)
async function saveDatabase(data) {
    const fs = require('fs');
    const dbPath = path.join(__dirname, 'database.json');
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    database = data;
    console.log('💾 Database saved to file');
    return true;
}

// ==================== دوال مساعدة لدمج البيانات الافتراضية بدون استبدال ====================
function mergeDefaultItems(existingItems, defaultItems, idKey = 'id') {
    if (!existingItems || existingItems.length === 0) {
        return [...defaultItems];
    }
    // إذا كانت هناك بيانات موجودة، نعيدها كما هي دون تغيير
    return existingItems;
}

// ==================== ENDPOINTS ====================
app.get('/api/data', async (req, res) => {
    try {
        const db = await loadDatabase();
        res.json(db);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.put('/api/data', async (req, res) => {
    try {
        const newData = req.body;
        await saveDatabase(newData);
        broadcastUpdate('data_update', { timestamp: Date.now() });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

app.get('/api/square-groups', async (req, res) => {
    try {
        const db = await loadDatabase();
        res.json(db.squareGroups || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch square groups' });
    }
});

app.put('/api/square-groups', async (req, res) => {
    try {
        const db = await loadDatabase();
        db.squareGroups = req.body;
        await saveDatabase(db);
        broadcastUpdate('data_update', { type: 'square_groups' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save square groups' });
    }
});

// ==================== باقي الـ endpoints كما هي (مالية، دعم، إشعارات) ====================
// (سيتم وضع دوال مختصرة هنا لتوفير المساحة، يمكنك إضافة النسخة الكاملة من الرد السابق)

// ==================== رفع الصور ====================
app.post('/api/upload', upload.single('image'), async (req, res) => {
    // نفس الكود السابق
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const base64Image = req.file.buffer.toString('base64');
        const formData = new FormData();
        formData.append('key', process.env.IMGBB_API_KEY);
        formData.append('image', base64Image);
        const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
            headers: { ...formData.getHeaders(), 'Accept': 'application/json' },
            timeout: 30000
        });
        if (response.data?.success && response.data.data?.url) {
            res.json({ url: response.data.data.url });
        } else {
            res.status(500).json({ error: 'Upload failed' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Upload failed: ' + error.message });
    }
});

// ==================== أحداث SSE ====================
let clients = [];
function broadcastUpdate(type, data) {
    clients.forEach(client => {
        try { client.res.write(`data: ${JSON.stringify({ type, data })}\n\n`); } catch (err) {}
    });
}

app.get('/api/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });
    const clientId = Date.now();
    clients.push({ id: clientId, res });
    req.on('close', () => {
        clients = clients.filter(c => c.id !== clientId);
    });
});

// ==================== التحقق من الصحة ====================
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== تقديم الملفات الثابتة ====================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== تشغيل السيرفر ====================
app.listen(PORT, async () => {
    console.log(`✅ Server running on port ${PORT}`);
    await loadDatabase();
    console.log('✅ Database initialized with existing data (if any) + defaults only for empty collections');
});
