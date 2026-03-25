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

// منع التحديثات المفرطة
let lastBroadcastTime = 0;
const BROADCAST_COOLDOWN = 2000; // 2 ثانية بين التحديثات

function broadcastUpdate(type, data) {
    // منع التحديثات المتكررة جداً - فقط لـ data_update
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

app.get('/api/events', (req, res) => {
    // إعدادات SSE
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
    
    // إرسال رسالة ترحيب
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to server', clientId })}\n\n`);
    
    // إرسال ping كل 30 ثانية للحفاظ على الاتصال
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
        // فقط إرسال إشعار بأن البيانات تغيرت، لكن لا نرسل البيانات الكاملة لتجنب الـ flood
        broadcastUpdate('data_update', { timestamp: Date.now(), message: 'Data updated' });
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
        newMessage.read = false;
        newMessage.replied = false;
        
        const currentData = await fetchData();
        const support = currentData.support || [];
        support.unshift(newMessage);
        currentData.support = support;
        
        await saveData(currentData);
        
        // إرسال إشعار برسالة الدعم الجديدة
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

// Reply to support message
app.post('/api/support/reply', async (req, res) => {
    try {
        const { messageId, recipient, subject, replyMessage } = req.body;
        
        if (!messageId || !recipient || !replyMessage) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const currentData = await fetchData();
        
        // إنشاء إشعار الرد
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
        
        // إضافة الإشعار لقاعدة البيانات
        const notifications = currentData.notifications || [];
        notifications.unshift(replyNotification);
        currentData.notifications = notifications;
        
        // تحديث رسالة الدعم الأصلية
        const support = currentData.support || [];
        const originalMessage = support.find(m => m.id === parseInt(messageId));
        if (originalMessage) {
            originalMessage.replied = true;
            originalMessage.replyDate = new Date().toISOString();
            originalMessage.replyMessage = replyMessage;
        }
        
        await saveData(currentData);
        
        // إرسال إشعار الرد للمستخدم
        broadcastUpdate('support_reply', {
            id: replyNotification.id,
            message: replyMessage,
            subject: subject,
            recipient: recipient,
            sender: 'Admin',
            date: new Date().toISOString()
        });
        
        // إرسال إشعار عادي أيضاً
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

// Mark support message as read
app.post('/api/support/read/:id', async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);
        const currentData = await fetchData();
        const support = currentData.support || [];
        const message = support.find(m => m.id === messageId);
        if (message) {
            message.read = true;
            await saveData(currentData);
            broadcastUpdate('support_read', { id: messageId });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ error: 'Failed to update message' });
    }
});

// Notification endpoint
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
        
        const currentData = await fetchData();
        const notifications = currentData.notifications || [];
        notifications.unshift(newNotification);
        currentData.notifications = notifications;
        await saveData(currentData);
        
        // إرسال الإشعار لجميع العملاء المتصلين
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

// Mark notification as read
app.post('/api/notifications/read/:id', async (req, res) => {
    try {
        const notifId = parseInt(req.params.id);
        const currentData = await fetchData();
        const notifications = currentData.notifications || [];
        const notification = notifications.find(n => n.id === notifId);
        if (notification) {
            notification.read = true;
            await saveData(currentData);
            broadcastUpdate('notification_read', { id: notifId });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Get unread counts
app.get('/api/unread-counts', async (req, res) => {
    try {
        const currentData = await fetchData();
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

// ==================== IMAGE UPLOAD USING IMGBB ====================
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(), 
        clients: clients.length,
        uptime: process.uptime()
    });
});

// Serve static files - SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🖼️  ImgBB API Key: ${process.env.IMGBB_API_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`💾 JSON Bin: ${process.env.JSON_BIN_ID ? '✓ Configured' : '✗ Missing'}`);
    console.log(`📡 SSE endpoint: /api/events`);
    console.log(`📨 Support reply endpoint: /api/support/reply`);
    console.log(`⏱️  Broadcast cooldown: ${BROADCAST_COOLDOWN}ms`);
});
