const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// CORS enabled
app.use(cors());

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/\s+/g, '_');
        cb(null, `${timestamp}_${safeName}`);
    }
});

const upload = multer({ storage });

// Static serving of uploaded files
app.use('/uploads', express.static(uploadDir));

// Multiple file upload endpoint
app.post('/upload', upload.array('media', 10), (req, res) => {
    console.log("sanath",req.body)
    console.log("sanathsanath",req.query)
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }
    const fileUrls = req.files.map(file => {
        return `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    });

    console.log(`[+] ${fileUrls.length} file(s) uploaded.`);
    console.log(fileUrls)
    res.json({
        message: 'Files uploaded successfully',
        files: fileUrls
    });
});

// Health check
app.get('/', (req, res) => {
    res.send('📦 Multi-file upload server is running');
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
