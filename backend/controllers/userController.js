const supabase = require('../db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, BASE_URL } = require('../config/config');
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

exports.getUserInfo = async (req, res) => {
    const userId = req.user.id;

    const { data: users, error } = await supabase
        .from('users')
        .select('id, firstname, middlename, lastname, email, profilePicture')
        .eq('id', userId);

    if (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'An error occurred.' });
    }

    if (users.length > 0) {
        const user = users[0];
        // For Vercel Blob URLs, return as-is since they're already full URLs
        // For local images, return relative path
        if (user.profilePicture && !user.profilePicture.startsWith('http')) {
            user.profilePicture = user.profilePicture.replace(/\\/g, '/');
        }
        res.json({ success: true, user: user });
    } else {
        res.status(404).json({ success: false, message: 'User not found.' });
    }
};

exports.updateUserInfo = async (req, res) => {
    const userId = req.params.id;
    const { firstname, middlename, lastname, email } = req.body;

    if (req.user.id != userId) {
        return res.status(403).json({ success: false, message: 'Unauthorized to update this user.' });
    }

    if (!firstname || !lastname || !email) {
        return res.status(400).json({ success: false, message: 'First name, last name, and email are required.' });
    }

    const { data, error } = await supabase
        .from('users')
        .update({ firstname, middlename, lastname, email })
        .eq('id', userId);

    if (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Error updating user information.' });
    }

    if (data === null) {
        return res.status(404).json({ success: false, message: 'User not found or no changes made.' });
    }

    res.json({ success: true, message: 'Account information updated successfully!' });
};

exports.uploadProfilePicture = async (req, res) => {
    const userId = req.user.id;
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    // Check if we're running on Vercel
    let profilepicturePath;
    if (process.env.VERCEL) {
        // Upload to Vercel Blob storage
        try {
            profilepicturePath = await uploadToVercelBlob(req.file, 'profiles');
            console.log('File uploaded to Vercel Blob:', profilepicturePath);
        } catch (uploadError) {
            console.error('Error uploading to Vercel Blob:', uploadError);
            return res.status(500).json({ success: false, message: 'Error uploading profile picture to Vercel Blob storage.' });
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
                    return res.status(500).json({ success: false, message: 'Error processing uploaded profile picture. Please try again or contact support.' });
                }
            }
        }
        profilepicturePath = `/images/${req.file.filename}`;
    }

    const { data, error } = await supabase
        .from('users')
        .update({ profilePicture: profilepicturePath })
        .eq('id', userId);

    if (error) {
        console.error('Error updating profile picture in DB:', error);
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
        return res.status(500).json({ success: false, message: 'Error saving profile picture.' });
    }

    // Check if no rows were affected (user not found or not owned by user)
    if (data && data.length === 0) {
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
        return res.status(404).json({ success: false, message: 'User not found or you do not have permission to update profile picture.' });
    }

    // For Vercel Blob URLs, return as-is since they're already full URLs
    // For local images, construct full URL
    const fullProfilePicturePath = profilepicturePath.startsWith('http') ? 
        profilepicturePath : 
        `${BASE_URL}${profilepicturePath.replace(/\\/g, '/')}`;
    res.json({ success: true, message: 'Profile picture updated successfully!', profilepicture: fullProfilePicturePath });
};

exports.getProfilePicture = async (req, res) => {
    const userId = req.user.id;

    const { data: users, error } = await supabase
        .from('users')
        .select('profilePicture')
        .eq('id', userId);

    if (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'An error occurred.' });
    }

    if (users.length > 0) {
        let profilepicture = users[0].profilePicture;
        // For Vercel Blob URLs, return as-is since they're already full URLs
        // For local images, return relative path
        if (profilepicture && !profilepicture.startsWith('http')) {
            profilepicture = profilepicture.replace(/\\/g, '/');
        }
        res.json({ success: true, profilepicture: profilepicture });
    } else {
        res.status(404).json({ success: false, message: 'User not found.' });
    }
};

exports.verifyCurrentPassword = async (req, res) => {
    const { currentPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required.' });
    }

    const { data: users, error } = await supabase
        .from('users')
        .select('password')
        .eq('id', userId);

    if (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'An error occurred.' });
    }

    if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const hashedPassword = users[0].password;
    bcrypt.compare(currentPassword, hashedPassword, (compareErr, isMatch) => {
        if (compareErr) {
            console.error(compareErr);
            return res.status(500).json({ success: false, message: 'An error occurred during password comparison.' });
        }
        if (isMatch) {
            res.json({ success: true, message: 'Current password matches.' });
        } else {
            res.status(401).json({ success: false, message: 'Current password does not match.' });
        }
    });
};

exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    console.log('/change-password: Request received for user ID:', userId, 'Email:', userEmail);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        return res.status(400).json({ success: false, message: 'All password fields are required.' });
    }

    if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ success: false, message: 'New password and confirm password do not match.' });
    }

    const { data: users, error: checkError } = await supabase
        .from('users')
        .select('password')
        .eq('id', userId);

    if (checkError) {
        console.error('/change-password: Error verifying current password from DB:', checkError);
        return res.status(500).json({ success: false, message: 'An error occurred while verifying current password.' });
    }

    if (users.length === 0) {
        console.log('/change-password: User not found for ID:', userId);
        return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const hashedPassword = users[0].password;
    bcrypt.compare(currentPassword, hashedPassword, async (compareErr, isMatch) => {
        if (compareErr) {
            console.error('/change-password: Error comparing current password:', compareErr);
            return res.status(500).json({ success: false, message: 'An error occurred during current password verification.' });
        }
        if (!isMatch) {
            console.log('/change-password: Invalid current password for user ID:', userId);
            return res.status(401).json({ success: false, message: 'Invalid current password.' });
        }

        bcrypt.hash(newPassword, 10, async (hashErr, newHashedPassword) => {
            if (hashErr) {
                console.error('/change-password: Error hashing new password:', hashErr);
                return res.status(500).json({ success: false, message: 'An error occurred during new password hashing.' });
            }

            const { data, error: updateError } = await supabase
                .from('users')
                .update({ password: newHashedPassword })
                .eq('id', userId);

            if (updateError) {
                console.error('/change-password: Error updating password in DB:', updateError);
                return res.status(500).json({ success: false, message: 'An error occurred while changing password.' });
            }

            console.log('/change-password: Password updated in DB for user ID:', userId);

            const expiresIn = '1h';
            const newAccessToken = jwt.sign({ id: userId, email: userEmail }, JWT_SECRET, { expiresIn });
            console.log('/change-password: Generated new token:', newAccessToken.substring(0, 10) + '...');

            const { error: tokenUpdateError } = await supabase
                .from('users')
                .update({ token: newAccessToken })
                .eq('id', userId);

            if (tokenUpdateError) {
                console.error('/change-password: Error updating token after password change:', tokenUpdateError);
                return res.status(500).json({ success: false, message: 'An error occurred while updating session.' });
            }

            console.log('/change-password: Token updated in DB for user ID:', userId);
            res.json({ success: true, message: 'Password changed successfully!', token: newAccessToken });
        });
    });
};