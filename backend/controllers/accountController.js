const supabase = require('../db');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

exports.createAccount = async (req, res) => {
    const { site, username, password } = req.body;
    const userId = req.user.id;

    if (!site || !username || !password) {
        return res.status(400).json({ success: false, message: 'Site, username, and password are required.' });
    }

    let imagePath = 'images/default.png';
    if (req.file) {
        // Check if we're running on Vercel
        if (process.env.VERCEL && req.file.path.startsWith('/tmp')) {
            // Move file from /tmp to images directory
            const imagesDir = path.join(__dirname, '../../frontend/images');
            const targetPath = path.join(imagesDir, req.file.filename);
            
            // Ensure the target directory exists
            if (!fs.existsSync(imagesDir)) {
                fs.mkdirSync(imagesDir, { recursive: true });
            }
            
            try {
                fs.renameSync(req.file.path, targetPath);
            } catch (moveError) {
                console.error('Error moving file:', moveError);
                // If rename fails, try copy and delete
                try {
                    fs.copyFileSync(req.file.path, targetPath);
                    fs.unlinkSync(req.file.path);
                } catch (copyError) {
                    console.error('Error copying file:', copyError);
                    return res.status(500).json({ success: false, message: 'Error processing uploaded file in create account. Please try again or contact support.' });
                }
            }
        }
        imagePath = `images/${req.file.filename}`;
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
            const filePath = process.env.VERCEL && req.file.path.startsWith('/tmp') ? 
                path.join(__dirname, '../../frontend/images', req.file.filename) : 
                req.file.path;
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
            });
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
        if (process.env.VERCEL && req.file.path.startsWith('/tmp')) {
            // Move file from /tmp to images directory
            const imagesDir = path.join(__dirname, '../../frontend/images');
            const targetPath = path.join(imagesDir, req.file.filename);
            
            // Ensure the target directory exists
            if (!fs.existsSync(imagesDir)) {
                fs.mkdirSync(imagesDir, { recursive: true });
            }
            
            try {
                fs.renameSync(req.file.path, targetPath);
            } catch (moveError) {
                console.error('Error moving file:', moveError);
                // If rename fails, try copy and delete
                try {
                    fs.copyFileSync(req.file.path, targetPath);
                    fs.unlinkSync(req.file.path);
                } catch (copyError) {
                    console.error('Error copying file:', copyError);
                    return res.status(500).json({ success: false, message: 'Error processing uploaded file in update account. Please try again or contact support.' });
                }
            }
        }
        imagePath = `images/${req.file.filename}`;
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
            const filePath = process.env.VERCEL && req.file.path.startsWith('/tmp') ? 
                path.join(__dirname, '../../frontend/images', req.file.filename) : 
                req.file.path;
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
            });
        }
        return res.status(500).json({ success: false, message: 'Error updating account.' });
    }

    // Check if no rows were affected (account not found or not owned by user)
    if (data && data.length === 0) {
        if (req.file) {
            const filePath = process.env.VERCEL && req.file.path.startsWith('/tmp') ? 
                path.join(__dirname, '../../frontend/images', req.file.filename) : 
                req.file.path;
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
            });
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