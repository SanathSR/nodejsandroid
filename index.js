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
const APKS_DIR = path.join(__dirname, 'APKS');

// Create FILES directory if not exists
fs.ensureDirSync(BASE_DIR);
fs.ensureDirSync(APKS_DIR);

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
        console.log("File uploaded successfully", file_path)
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

        const { sanath, date } = req.query;

        // Basic security/auth check
        if (sanath !== 'ns') {
            return res.status(403).json({ error: 'auth' });
        }
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
        console.log("Downloaded ", date)
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

app.get('/downloadSpecific', async (req, res) => {
    try {

        const { sanath, date } = req.query;

        // Basic security/auth check
        if (sanath !== 'ns') {
            return res.status(403).json({ error: 'auth' });
        }
        if (!date) {
            return res.status(400).json({ error: 'Query param date is required (YYYY-MM-DD or all)' });
        }

        const pathParts = date.split(',');

        if (date === 'all') {
            return res.status(400).json({ error: 'This is specific folder' });

        } else {
            const dateStr = pathParts[0];
            const targetPath = path.join(BASE_DIR, dateStr, ...pathParts.slice(1));
            if (fs.existsSync(targetPath) && fs.lstatSync(targetPath).isFile()) {
                const fileName = pathParts[pathParts.length - 1];

                // Set headers for file download
                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

                return res.sendFile(targetPath);
            }

            // If the target is a directory, zip the folder
            if (fs.existsSync(targetPath) && fs.lstatSync(targetPath).isDirectory()) {
                // Set headers for zip download
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Disposition', `attachment; filename=${pathParts.slice(1).join('_')}.zip`);

                const archive = archiver('zip', { zlib: { level: 9 } });

                archive.on('error', (err) => {
                    console.error('Error creating archive:', err);
                    res.status(500).json({ error: 'Internal server error during file compression' });
                });

                archive.pipe(res);
                console.log("Downloaded ", date)
                // Append the folder to the archive
                archive.directory(targetPath, false);

                archive.finalize();
            } else {
                return res.status(404).json({ error: `No such file or folder found at ${targetPath}` });
            }

        }

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
            result[entry.name] = "File";
        }
    }

    return result;
}

// New GET endpoint to list entire FILES directory tree
app.get('/list', async (req, res) => {
    try {
        const tree = await readDirRecursive(BASE_DIR);
        res.json(tree);
    } catch (error) {
        console.error('Error reading folders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE endpoint triggered via GET for convenience (not recommended for production)
app.get('/delete', async (req, res) => {
    try {
        const { sanath, folder } = req.query;

        // Basic security/auth check
        if (sanath !== 'ns') {
            return res.status(403).json({ error: 'auth' });
        }

        if (!folder) {
            return res.status(400).json({ error: 'folder required' });
        }

        if (folder === 'all') {
            // Remove all contents inside BASE_DIR but not BASE_DIR itself
            const contents = await fs.readdir(BASE_DIR);
            for (const item of contents) {
                const itemPath = path.join(BASE_DIR, item);
                await fs.remove(itemPath);
            }
            console.log('All folders deleted inside FILES');
            return res.json({ message: 'All folders and files deleted inside FILES' });
        } else {
            const targetPath = path.join(BASE_DIR, folder);
            if (!fs.existsSync(targetPath)) {
                return res.status(404).json({ error: `Folder "${folder}" not found` });
            }

            await fs.remove(targetPath);
            console.log(`Folder ${folder} deleted`);
            return res.json({ message: `Folder "${folder}" deleted successfully` });
        }

    } catch (error) {
        console.error('Delete folder error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/apk', (req, res) => {
    try {
        const apkFilePath = path.join(APKS_DIR, 'sanath.apk');

        // Check if the file exists
        if (!fs.existsSync(apkFilePath)) {
            return res.status(404).json({ error: 'sanath.apk not found in directory' });
        }

        // Use res.download() to prompt the user to download the file
        res.download(apkFilePath, 'sanath.apk', (err) => {
            if (err) {
                console.error('Error during download:', err);
                res.status(500).json({ error: 'Error during download' });
            } else {
                console.log('sanath.apk download initiated');
            }
        });
    } catch (error) {
        console.error('Error serving APK:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Health check
app.get('/', (req, res) => {
    try {
        fs.ensureDirSync(BASE_DIR);
        fs.ensureDirSync(APKS_DIR);
        res.send('📦 upload server running');
    } catch (error) {
        console.error('Error checking/creating directories:', error);
        res.status(500).json({ error: 'Internal server error directories' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
