const supabase = require('../db');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const { uploadToVercelBlob } = require('../utils/vercelBlob');

// Helper function to determine the correct images directory path
const getImagesDirectory = (baseDir) => {
    console.log('Getting images directory from baseDir:', baseDir);
    
    // Try multiple possible paths for Vercel deployment
    let imagesDir = path.join(baseDir, '../../frontend/images');
    console.log('Trying imagesDir:', imagesDir);
    
    // If the standard path doesn't work, try alternative paths
    if (!fs.existsSync(path.join(baseDir, '../../frontend'))) {
        console.log('Standard frontend path not found, trying alternative paths');
        // Try without the extra ../
        imagesDir = path.join(baseDir, '../frontend/images');
        console.log('Trying alternative imagesDir:', imagesDir);
        
        // If that doesn't work, try with just frontend
        if (!fs.existsSync(path.join(baseDir, '../frontend'))) {
            imagesDir = path.join(baseDir, 'frontend/images');
            console.log('Trying another alternative imagesDir:', imagesDir);
        }
    }
    
    return imagesDir;
};

exports.createAccount = async (req, res) => {
    const { site, username, password } = req.body;
    const userId = req.user.id;

    if (!site || !username || !password) {
        return res.status(400).json({ success: false, message: 'Site, username, and password are required.' });
    }

    let imagePath = 'images/default.png';
    if (req.file) {
        // Check if we're running on Vercel
        if (process.env.VERCEL) {
            // Upload to Vercel Blob storage
            try {
                imagePath = await uploadToVercelBlob(req.file, 'accounts');
                console.log('File uploaded to Vercel Blob:', imagePath);
            } catch (uploadError) {
                console.error('Error uploading to Vercel Blob:', uploadError);
                return res.status(500).json({ success: false, message: 'Error uploading image to Vercel Blob storage.' });
            }
        } else {
            // For local development, move file from /tmp to images directory
            if (req.file.path && req.file.path.startsWith('/tmp')) {
                // Move file from /tmp to images directory
                console.log('Current __dirname:', __dirname);
                const imagesDir = getImagesDirectory(__dirname);
                const targetPath = path.join(imagesDir, req.file.filename);
                console.log('Calculated targetPath:', targetPath);
                
                // Ensure the target directory exists
                console.log('Checking if directory exists:', imagesDir);
                if (!fs.existsSync(imagesDir)) {
                    console.log('Creating directory:', imagesDir);
                    try {
                        fs.mkdirSync(imagesDir, { recursive: true });
                        console.log('Directory created successfully');
                    } catch (mkdirError) {
                        console.error('Error creating directory:', mkdirError);
                        return res.status(500).json({ success: false, message: 'Error creating image directory. Please try again or contact support.' });
                    }
                } else {
                    console.log('Directory already exists');
                }
                
                try {
                    console.log('Moving file from', req.file.path, 'to', targetPath);
                    fs.renameSync(req.file.path, targetPath);
                    console.log('File moved successfully');
                } catch (moveError) {
                    console.error('Error moving file:', moveError);
                    // If rename fails, try copy and delete
                    try {
                        console.log('Attempting to copy file instead');
                        fs.copyFileSync(req.file.path, targetPath);
                        fs.unlinkSync(req.file.path);
                        console.log('File copied and original deleted successfully');
                    } catch (copyError) {
                        console.error('Error copying file:', copyError);
                        return res.status(500).json({ success: false, message: 'Error processing uploaded file in create account. Please try again or contact support.' });
                    }
                }
            }
            // For local development, the file is already in the correct directory
            imagePath = `images/${req.file.filename}`;
        }
    } else if (req.body.image === 'images/default.png') {
        imagePath = 'images/default.png';
    }

    const { data, error } = await supabase
        .from('accounts')
        .insert([
            {
                site: site,
                username: username,
                password: password,
                image: imagePath,
                user_id: userId
            }
        ])
        .select();

    if (error) {
        console.error(error);
        if (req.file) {
            // For Vercel deployments using Vercel Blob, we don't need to delete local files
            // For local development, delete the file
            if (!process.env.VERCEL) {
                let filePath = req.file.path;
                if (req.file.path && req.file.path.startsWith('/tmp')) {
                    const imagesDir = getImagesDirectory(__dirname);
                    filePath = path.join(imagesDir, req.file.filename);
                }
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                });
            }
        }
        return res.status(500).json({ success: false, message: 'Error creating account.' });
    }

    res.json({ success: true, message: 'Account created successfully!', accountId: data[0].id });
};

exports.getAccounts = async (req, res) => {
    console.log('/accounts: Request received for user ID:', req.user.id);
    const userId = req.user.id;

    const { data: accounts, error } = await supabase
        .from('accounts')
        .select('id, site, username, password, image')
        .eq('user_id', userId);

    if (error) {
        console.error('/accounts: DB Error reading accounts:', error);
        return res.status(500).json({ success: false, message: 'Error reading accounts.' });
    }

    const accountsWithFullImageUrls = accounts.map(account => {
        if (account.image && !account.image.startsWith('http')) {
            // For static images, return relative path instead of constructing full URL
            account.image = account.image.replace(/\\/g, '/');
        }
        return account;
    });

    console.log('/accounts: Successfully retrieved accounts for user ID:', userId, 'Count:', accounts.length);
    res.json({ success: true, message: 'Accounts retrieved successfully!', accounts: accountsWithFullImageUrls });
};

exports.updateAccount = async (req, res) => {
    const accountId = req.params.id;
    const { site, username, password } = req.body;
    const userId = req.user.id;

    if (!site || !username || !password) {
        return res.status(400).json({ success: false, message: 'Site, username, and password are required.' });
    }

    let imagePath = req.body.currentImage;
    if (req.file) {
        // Check if we're running on Vercel
        if (process.env.VERCEL) {
            // Upload to Vercel Blob storage
            try {
                imagePath = await uploadToVercelBlob(req.file, 'accounts');
                console.log('File uploaded to Vercel Blob:', imagePath);
            } catch (uploadError) {
                console.error('Error uploading to Vercel Blob:', uploadError);
                return res.status(500).json({ success: false, message: 'Error uploading image to Vercel Blob storage.' });
            }
        } else {
            // For local development, move file from /tmp to images directory
            if (req.file.path && req.file.path.startsWith('/tmp')) {
                // Move file from /tmp to images directory
                console.log('Current __dirname:', __dirname);
                const imagesDir = getImagesDirectory(__dirname);
                const targetPath = path.join(imagesDir, req.file.filename);
                console.log('Calculated targetPath:', targetPath);
                
                // Ensure the target directory exists
                console.log('Checking if directory exists:', imagesDir);
                if (!fs.existsSync(imagesDir)) {
                    console.log('Creating directory:', imagesDir);
                    try {
                        fs.mkdirSync(imagesDir, { recursive: true });
                        console.log('Directory created successfully');
                    } catch (mkdirError) {
                        console.error('Error creating directory:', mkdirError);
                        return res.status(500).json({ success: false, message: 'Error creating image directory. Please try again or contact support.' });
                    }
                } else {
                    console.log('Directory already exists');
                }
                
                try {
                    console.log('Moving file from', req.file.path, 'to', targetPath);
                    fs.renameSync(req.file.path, targetPath);
                    console.log('File moved successfully');
                } catch (moveError) {
                    console.error('Error moving file:', moveError);
                    // If rename fails, try copy and delete
                    try {
                        console.log('Attempting to copy file instead');
                        fs.copyFileSync(req.file.path, targetPath);
                        fs.unlinkSync(req.file.path);
                        console.log('File copied and original deleted successfully');
                    } catch (copyError) {
                        console.error('Error copying file:', copyError);
                        return res.status(500).json({ success: false, message: 'Error processing uploaded file in update account. Please try again or contact support.' });
                    }
                }
            }
            // For local development, the file is already in the correct directory
            imagePath = `images/${req.file.filename}`;
        }
    }

    const { data, error } = await supabase
        .from('accounts')
        .update({
            site: site,
            username: username,
            password: password,
            image: imagePath
        })
        .eq('id', accountId)
        .eq('user_id', userId);

    if (error) {
        console.error(error);
        if (req.file) {
            // For Vercel deployments using Vercel Blob, we don't need to delete local files
            // For local development, delete the file
            if (!process.env.VERCEL) {
                let filePath = req.file.path;
                if (req.file.path && req.file.path.startsWith('/tmp')) {
                    const imagesDir = getImagesDirectory(__dirname);
                    filePath = path.join(imagesDir, req.file.filename);
                }
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                });
            }
        }
        return res.status(500).json({ success: false, message: 'Error updating account.' });
    }

    // Check if no rows were affected (account not found or not owned by user)
    if (data && data.length === 0) {
        if (req.file) {
            // For Vercel deployments using Vercel Blob, we don't need to delete local files
            // For local development, delete the file
            if (!process.env.VERCEL) {
                let filePath = req.file.path;
                if (req.file.path && req.file.path.startsWith('/tmp')) {
                    const imagesDir = getImagesDirectory(__dirname);
                    filePath = path.join(imagesDir, req.file.filename);
                }
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                });
            }
        }
        return res.status(404).json({ success: false, message: 'Account not found or you do not have permission to update it.' });
    }

    res.json({ success: true, message: 'Account updated successfully!', image: imagePath });
};

exports.deleteAccount = async (req, res) => {
    const accountId = req.params.id;
    const userId = req.user.id;

    const { data, error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', userId);

    if (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Error deleting account.' });
    }

    // Check if no rows were affected (account not found or not owned by user)
    if (data && data.length === 0) {
        return res.status(404).json({ success: false, message: 'Account not found or you do not have permission to delete it.' });
    }

    res.json({ success: true, message: 'Account deleted successfully!' });
};