const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const supabase = require('../db');
const transporter = require('../utils/mailer');
const { JWT_SECRET } = require('../config/config');

exports.requestOtp = async (req, res) => {
    const { email } = req.body;
    
    console.log('OTP request for email:', email);

    if (!email) {
        console.log('Email is required');
        return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    // Check if user already exists
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);

    if (userError) {
        console.error('Database error during email check:', userError);
        return res.status(500).json({ success: false, message: 'An error occurred during email check.' });
    }
    
    console.log('Existing users with email:', users.length);

    if (users.length > 0) {
        console.log('Email already in use:', email);
        return res.status(409).json({ success: false, message: 'Email already in use. Please try logging in.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + (5 * 60 * 1000));
    
    console.log('Generated OTP:', otp, 'Expires at:', expiresAt);

    // Insert or update OTP
    const { data, error: otpError } = await supabase
        .from('otps')
        .upsert(
            { email: email, otp_code: otp, expires_at: expiresAt },
            { onConflict: 'email' }
        );

    if (otpError) {
        console.error('Error storing OTP in DB:', otpError);
        return res.status(500).json({ success: false, message: 'An error occurred while storing OTP.' });
    }
    
    console.log('OTP stored successfully');

    try {
        const emailTemplatePath = path.join(__dirname, '../../frontend', 'templates', 'otp_email.html');
        let emailHtml = fs.readFileSync(emailTemplatePath, 'utf8');
        emailHtml = emailHtml.replace('{{OTP_CODE}}', otp);

        await transporter.sendMail({
            from: '"Leirad Noznag" <darielganzon2003@gmail.com>',
            to: email,
            subject: 'Your OTP for Registration',
            html: emailHtml,
            text: `Your One-Time Password (OTP) is: ${otp}. It is valid for 5 minutes. Do not share this with anyone.`,
        });
        console.log('OTP email sent successfully to:', email);
        res.json({ success: true, message: 'OTP sent successfully to ' + email });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP. Mailer Error: ' + error.message });
    }
};

exports.requestPasswordResetOtp = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    // Check if user exists
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email);

    if (userError) {
        console.error('Database error during user check for forgot password:', userError);
        return res.status(500).json({ success: false, message: 'An error occurred.' });
    }

    if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'Email not found.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + (5 * 60 * 1000));

    // Insert or update OTP
    const { data, error: otpError } = await supabase
        .from('otps')
        .upsert(
            { email: email, otp_code: otp, expires_at: expiresAt },
            { onConflict: 'email' }
        );

    if (otpError) {
        console.error('Error storing OTP for forgot password in DB:', otpError);
        return res.status(500).json({ success: false, message: 'An error occurred while storing OTP.' });
    }

    try {
        const emailTemplatePath = path.join(__dirname, '../../frontend', 'templates', 'forgot_password_otp_email.html');
        let emailHtml = fs.readFileSync(emailTemplatePath, 'utf8');
        emailHtml = emailHtml.replace('{{OTP_CODE}}', otp);

        await transporter.sendMail({
            from: '"Leirad Noznag" <darielganzon2003@gmail.com>',
            to: email,
            subject: 'Password Reset OTP',
            html: emailHtml,
            text: `Your One-Time Password (OTP) for password reset is: ${otp}. It is valid for 5 minutes. Do not share this with anyone.`,
        });
        res.json({ success: true, message: 'Password reset OTP sent successfully to ' + email });
    } catch (error) {
        console.error('Error sending password reset email:', error);
        res.status(500).json({ success: false, message: 'Failed to send password reset OTP. Mailer Error: ' + error.message });
    }
};

exports.verifyOtpAndRegister = async (req, res) => {
    const { firstname, middlename, lastname, email, password, otp } = req.body;
    
    console.log('Registration attempt for email:', email);
    console.log('Registration data:', { firstname, middlename, lastname, email, password: password ? '***' : 'undefined', otp: otp ? '***' : 'undefined' });

    if (!firstname || !lastname || !email || !password || !otp) {
        console.log('Missing required fields');
        return res.status(400).json({ success: false, message: 'All fields including OTP are required.' });
    }

    // Get OTP from database
    const { data: otps, error: otpError } = await supabase
        .from('otps')
        .select('otp_code, expires_at')
        .eq('email', email);

    if (otpError) {
        console.error('Error retrieving OTP from DB:', otpError);
        return res.status(500).json({ success: false, message: 'An error occurred during OTP verification.' });
    }
    
    console.log('OTPs found:', otps.length);

    if (otps.length === 0) {
        console.log('No OTP found for email:', email);
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    const storedOtp = otps[0];
    const currentTime = new Date();
    
    console.log('Stored OTP:', storedOtp.otp_code, 'Provided OTP:', otp);
    console.log('Current time:', currentTime, 'Expires at:', new Date(storedOtp.expires_at));

    if (storedOtp.otp_code !== otp || currentTime > new Date(storedOtp.expires_at)) {
        console.log('OTP mismatch or expired');
        // Delete expired/invalid OTP
        const { error: deleteError } = await supabase
            .from('otps')
            .delete()
            .eq('email', email);

        if (deleteError) console.error('Error deleting expired/invalid OTP:', deleteError);
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    // Check if email already exists
    const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);

    if (checkError) {
        console.error('Error checking existing user:', checkError);
        res.status(500).json({ success: false, message: 'An error occurred.' });
        return;
    }
    
    console.log('Existing users with email:', existingUsers.length);

    if (existingUsers.length > 0) {
        console.log('Email already in use:', email);
        res.status(409).json({ success: false, message: 'Email already in use.' });
        return;
    }

    bcrypt.hash(password, 10, async (hashErr, hashedPassword) => {
        if (hashErr) {
            console.error('Password hashing error:', hashErr);
            res.status(500).json({ success: false, message: 'An error occurred during password hashing.' });
            return;
        }
        
        console.log('Password hashed successfully');

        // Insert user
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([
                {
                    firstname: firstname,
                    middlename: middlename,
                    lastname: lastname,
                    email: email,
                    password: hashedPassword,
                    profilepicture: 'images/default-profile.png'
                }
            ])
            .select();

        if (insertError) {
            console.error('Error inserting user:', insertError);
            res.status(500).json({ success: false, message: 'An error occurred.' });
            return;
        }
        
        console.log('User inserted successfully:', newUser);

        // Delete OTP after successful registration
        const { error: deleteError } = await supabase
            .from('otps')
            .delete()
            .eq('email', email);

        if (deleteError) console.error('Error deleting OTP after successful registration:', deleteError);

        const accessToken = jwt.sign({ id: newUser[0].id, email: email }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ success: true, message: 'Registration successful!', token: accessToken });
    });
};

exports.verifyPasswordResetOtp = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    // Get OTP from database
    const { data: otps, error: otpError } = await supabase
        .from('otps')
        .select('otp_code, expires_at')
        .eq('email', email);

    if (otpError) {
        console.error('Error retrieving OTP for password reset from DB:', otpError);
        return res.status(500).json({ success: false, message: 'An error occurred during OTP verification.' });
    }

    if (otps.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    const storedOtp = otps[0];
    const currentTime = new Date();

    if (storedOtp.otp_code !== otp || currentTime > new Date(storedOtp.expires_at)) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    // Delete OTP after successful verification
    const { error: deleteError } = await supabase
        .from('otps')
        .delete()
        .eq('email', email);

    if (deleteError) console.error('Error deleting OTP after successful verification:', deleteError);

    res.json({ success: true, message: 'OTP verified successfully. You can now reset your password.' });
};

exports.resetPassword = async (req, res) => {
    const { email, newPassword, confirmNewPassword } = req.body;

    if (!email || !newPassword || !confirmNewPassword) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ success: false, message: 'New password and confirm password do not match.' });
    }

    bcrypt.hash(newPassword, 10, async (hashErr, hashedPassword) => {
        if (hashErr) {
            console.error(hashErr);
            res.status(500).json({ success: false, message: 'An error occurred during password hashing.' });
            return;
        }

        // Update password
        const { data, error: updateError } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('email', email);

        if (updateError) {
            console.error('Error updating password:', updateError);
            return res.status(500).json({ success: false, message: 'An error occurred while resetting password.' });
        }

        if (data === null) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Clear token
        const { error: clearTokenError } = await supabase
            .from('users')
            .update({ token: null })
            .eq('email', email);

        if (clearTokenError) {
            console.error('Error clearing token after password reset:', clearTokenError);
        }

        res.json({ success: true, message: 'Password has been reset successfully! Please log in with your new password.' });
    });
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    
    console.log('Login attempt for email:', email);

    // Get user
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);

    if (error) {
        console.error('Database error during login:', error);
        return res.status(500).json({ success: false, message: 'An error occurred.' });
    }
    
    console.log('Users found:', users.length);

    if (users.length > 0) {
        const user = users[0];
        console.log('User found:', user.email);
        
        bcrypt.compare(password, user.password, async (compareErr, isMatch) => {
            if (compareErr) {
                console.error('Password comparison error:', compareErr);
                return res.status(500).json({ success: false, message: 'An error occurred during password comparison.' });
            }
            
            console.log('Password match:', isMatch);
            
            if (isMatch) {
                const expiresIn = '1h';
                const accessToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn });

                // Update token
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ token: accessToken })
                    .eq('id', user.id);

                if (updateError) {
                    console.error('Error storing token in DB:', updateError);
                    return res.status(500).json({ success: false, message: 'An error occurred during login.' });
                }

                res.json({
                    success: true,
                    message: 'Login successful!',
                    token: accessToken
                });
            } else {
                res.status(401).json({ success: false, message: 'Invalid credentials!' });
            }
        });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials!' });
    }
};

exports.logout = async (req, res) => {
    const userId = req.user.id;

    // Clear token
    const { error } = await supabase
        .from('users')
        .update({ token: null })
        .eq('id', userId);

    if (error) {
        console.error('Error clearing token from DB on logout:', error);
        return res.status(500).json({ success: false, message: 'An error occurred during logout.' });
    }

    res.json({ success: true, message: 'Logout successful!' });
};