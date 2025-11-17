const multer = require('multer');
const path = require('path');
const fs = require('fs');

// For Vercel deployments, we'll use memory storage to upload directly to Vercel Blob
// For local development, we'll use disk storage
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true' || process.env.NOW_REGION;
const storage = isVercel ? 
    multer.memoryStorage() : // Store in memory for Vercel
    multer.diskStorage({
        destination: function (req, file, cb) {
            let uploadDir = path.join(__dirname, '../../frontend', 'images');
            // Local development - use frontend/images directory
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    });

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpeg, jpg, png, gif) are allowed!'));
    }
});

module.exports = upload;
