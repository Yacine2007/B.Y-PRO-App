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
app.use(express.static(path.join(__dirname, 'public'))); // Serve static frontend files

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// JSON Bin configuration
const JSON_BIN_URL = `https://api.jsonbin.io/v3/b/${process.env.JSON_BIN_ID}`;
const JSON_BIN_HEADERS = {
    'Content-Type': 'application/json',
    'X-Master-Key': process.env.JSON_BIN_MASTER_KEY,
};

// Cache data in memory (optional, but reduces API calls)
let cachedData = null;
let lastFetch = 0;
const CACHE_TTL = 30000; // 30 seconds

// Fetch data from JSON Bin (with cache)
async function fetchData() {
    const now = Date.now();
    if (cachedData && (now - lastFetch) < CACHE_TTL) {
        return cachedData;
    }
    try {
        const response = await axios.get(JSON_BIN_URL, {
            headers: { 'X-Master-Key': process.env.JSON_BIN_MASTER_KEY }
        });
        cachedData = response.data.record;
        lastFetch = now;
        return cachedData;
    } catch (error) {
        console.error('Error fetching data from JSON Bin:', error.message);
        throw error;
    }
}

// Save data to JSON Bin
async function saveData(data) {
    try {
        const response = await axios.put(JSON_BIN_URL, data, {
            headers: JSON_BIN_HEADERS
        });
        cachedData = data; // update cache
        lastFetch = Date.now();
        return response.data;
    } catch (error) {
        console.error('Error saving data to JSON Bin:', error.message);
        throw error;
    }
}

// Routes

// Get all data
app.get('/api/data', async (req, res) => {
    try {
        const data = await fetchData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Save all data (PUT)
app.put('/api/data', async (req, res) => {
    try {
        const newData = req.body;
        await saveData(newData);
        res.json({ success: true, message: 'Data saved successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Image upload to Cloudinary
const upload = multer({ storage: multer.memoryStorage() });
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Convert buffer to base64 for Cloudinary upload
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

// Optional: endpoint for image deletion (if needed)
app.delete('/api/delete-image', async (req, res) => {
    try {
        const { publicId } = req.body;
        if (!publicId) return res.status(400).json({ error: 'No publicId' });
        const result = await cloudinary.uploader.destroy(publicId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the admin panel (if it's in public folder)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
