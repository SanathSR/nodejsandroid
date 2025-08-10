const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra'); // fs-extra for easier mkdirs
const cors = require('cors');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base directory for files
const BASE_DIR = path.join(__dirname, 'FILES');

// Create FILES directory if not exists
fs.ensureDirSync(BASE_DIR);

// Multer setup with memory storage, we will manually save file in the right folder
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper: get today's date folder name YYYY-MM-DD
function getTodayFolderName() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

// Upload endpoint
app.post('/upload', upload.single('media'), async (req, res) => {
    try {
        const {
            album = "unknown",
            file_size,
            file_path = "unknown"
        } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'media file are required' });
        }

        // Extract original filename from file_path (like Snapchat-1613563311.mp4)
        const originalName = path.basename(file_path);

        // Prepare folders: FILES/<today>/<album>
        const todayFolder = getTodayFolderName();
        const targetDir = path.join(BASE_DIR, todayFolder, album);
        await fs.ensureDir(targetDir);

        // Prepare filename: datetime_originalName
        const datetime = Date.now();
        const safeOriginalName = originalName.replace(/\s+/g, '_');
        const filename = `${datetime}_${safeOriginalName}`;

        // Save the file buffer to the target folder
        const savePath = path.join(targetDir, filename);
        await fs.writeFile(savePath, file.buffer);

        // Respond with path info
        res.json({
            message: 'File uploaded successfully',
            path: savePath.replace(__dirname, '') // relative path
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Download endpoint
// Query param: ?date=YYYY-MM-DD or ?date=all
app.get('/download', async (req, res) => {
    try {
        const date = req.query.date;

        if (!date) {
            return res.status(400).json({ error: 'Query param date is required (YYYY-MM-DD or all)' });
        }

        let folderToZip;

        if (date === 'all') {
            folderToZip = BASE_DIR;
        } else {
            // Validate date format YYYY-MM-DD roughly
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD or all' });
            }
            folderToZip = path.join(BASE_DIR, date);

            if (!fs.existsSync(folderToZip)) {
                return res.status(404).json({ error: `No folder found for date ${date}` });
            }
        }

        // Set response headers for zip download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${date === 'all' ? 'FILES.zip' : `${date}.zip`}`);

        // Create archive and pipe to response
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.on('error', err => {
            throw err;
        });

        archive.pipe(res);

        // Append folder to archive
        archive.directory(folderToZip, false);

        archive.finalize();

    } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Helper function to recursively read directory contents and build JSON tree
async function readDirRecursive(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const result = {};

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            result[entry.name] = await readDirRecursive(fullPath);
        } else {
            // For files, you can just list the filename or null if you prefer
            result[entry.name] = null;
        }
    }

    return result;
}

// New GET endpoint to list entire FILES directory tree
app.get('/list-folders', async (req, res) => {
    try {
        const tree = await readDirRecursive(BASE_DIR);
        res.json(tree);
    } catch (error) {
        console.error('Error reading folders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Health check
app.get('/', (req, res) => {
    res.send('📦 upload server running');
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
