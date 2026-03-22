const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// JSON Bin
const JSON_BIN_URL = `https://api.jsonbin.io/v3/b/${process.env.JSON_BIN_ID}`;
const JSON_BIN_HEADERS = {
    'Content-Type': 'application/json',
    'X-Master-Key': process.env.JSON_BIN_MASTER_KEY,
};

// Cache
let cachedData = null;
let lastFetch = 0;
const CACHE_TTL = 1000; // 1 second cache for real-time

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

// SSE Clients for real-time updates
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

// API Routes
app.get('/api/data', async (req, res) => {
    try {
        const data = await fetchData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.put('/api/data', async (req, res) => {
    try {
        await saveData(req.body);
        broadcastUpdate('data_update', req.body);
        res.json({ success: true });
    } catch (error) {
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
        
        // Broadcast to all clients
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

// Image upload
const upload = multer({ storage: multer.memoryStorage() });
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const base64 = req.file.buffer.toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${base64}`;
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: process.env.CLOUDINARY_FOLDER || 'B.Y PRO App',
            resource_type: 'auto'
        });
        res.json({ url: result.secure_url });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
