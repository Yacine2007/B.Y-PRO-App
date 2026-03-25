const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// JSON Bin configuration
const JSON_BIN_URL = `https://api.jsonbin.io/v3/b/${process.env.JSON_BIN_ID}`;
const JSON_BIN_HEADERS = {
    'Content-Type': 'application/json',
    'X-Master-Key': process.env.JSON_BIN_MASTER_KEY,
};

// Cache
let cachedData = null;
let lastFetch = 0;
const CACHE_TTL = 30000; // 30 seconds

async function fetchData() {
    const now = Date.now();
    if (cachedData && (now - lastFetch) < CACHE_TTL) return cachedData;
    try {
        const response = await axios.get(JSON_BIN_URL, {
            headers: { 'X-Master-Key': process.env.JSON_BIN_MASTER_KEY }
        });
        cachedData = response.data.record;
        lastFetch = now;
        return cachedData;
    } catch (error) {
        console.error('Error fetching data:', error.message);
        throw error;
    }
}

async function saveData(data) {
    try {
        const response = await axios.put(JSON_BIN_URL, data, { headers: JSON_BIN_HEADERS });
        cachedData = data;
        lastFetch = Date.now();
        return response.data;
    } catch (error) {
        console.error('Error saving data:', error.message);
        throw error;
    }
}

// SSE Clients
let clients = [];

app.get('/api/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    
    const clientId = Date.now();
    clients.push({ id: clientId, res });
    
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected' })}\n\n`);
    
    req.on('close', () => {
        clients = clients.filter(client => client.id !== clientId);
    });
});

function broadcastUpdate(type, data) {
    clients.forEach(client => {
        try {
            client.res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
        } catch (err) {}
    });
}

// ==================== API Routes ====================

// Get all data
app.get('/api/data', async (req, res) => {
    try {
        const data = await fetchData();
        res.json(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Save all data
app.put('/api/data', async (req, res) => {
    try {
        await saveData(req.body);
        broadcastUpdate('data_update', req.body);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Support message endpoint
app.post('/api/support', async (req, res) => {
    try {
        const newMessage = req.body;
        newMessage.date = new Date().toISOString();
        newMessage.id = Date.now();
        
        const currentData = await fetchData();
        const support = currentData.support || [];
        support.unshift(newMessage);
        currentData.support = support;
        
        await saveData(currentData);
        
        broadcastUpdate('support_new', newMessage);
        broadcastUpdate('data_update', currentData);
        
        res.json({ success: true, message: 'Support request received' });
    } catch (error) {
        console.error('Support error:', error);
        res.status(500).json({ error: 'Failed to save support message' });
    }
});

// Notification endpoint
app.post('/api/notifications', async (req, res) => {
    try {
        const newNotification = req.body;
        newNotification.id = Date.now();
        newNotification.date = new Date().toISOString();
        
        const currentData = await fetchData();
        const notifications = currentData.notifications || [];
        notifications.unshift(newNotification);
        currentData.notifications = notifications;
        await saveData(currentData);
        
        broadcastUpdate('notification_new', newNotification);
        broadcastUpdate('data_update', currentData);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

// ==================== IMAGE UPLOAD USING IMGBB ====================
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        console.log('Uploading image:', req.file.originalname, 'Size:', req.file.size);
        
        // تحويل الصورة إلى base64
        const base64Image = req.file.buffer.toString('base64');
        
        // إنشاء FormData للطلب إلى ImgBB
        const formData = new FormData();
        formData.append('key', process.env.IMGBB_API_KEY);
        formData.append('image', base64Image);
        
        // إرسال الصورة إلى ImgBB
        const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
            headers: {
                ...formData.getHeaders(),
                'Accept': 'application/json'
            },
            timeout: 30000 // 30 seconds timeout
        });
        
        if (response.data && response.data.success && response.data.data && response.data.data.url) {
            console.log('Image uploaded successfully:', response.data.data.url);
            res.json({ url: response.data.data.url });
        } else {
            console.error('ImgBB upload failed:', response.data);
            res.status(500).json({ error: 'Upload failed: Invalid response from ImgBB' });
        }
        
    } catch (error) {
        console.error('Upload error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        
        // رسالة خطأ مفيدة
        let errorMessage = 'Upload failed';
        if (error.response?.data?.error?.message) {
            errorMessage = error.response.data.error.message;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        res.status(500).json({ error: errorMessage });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files - fallback to index.html for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🖼️  ImgBB API Key: ${process.env.IMGBB_API_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`💾 JSON Bin ID: ${process.env.JSON_BIN_ID ? '✓ Configured' : '✗ Missing'}`);
    console.log(`☁️  Cloudinary: Disabled (using ImgBB instead)`);
});
