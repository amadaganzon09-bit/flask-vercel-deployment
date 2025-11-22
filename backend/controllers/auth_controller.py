from flask import request, jsonify, current_app
import bcrypt
import jwt
import datetime
import random
import os
from utils.supabase_client import supabase
from utils.mailer import send_mail
from config import Config

def request_otp():
    data = request.get_json()
    email = data.get('email')
    
    print(f'OTP request for email: {email}')

    if not email:
        print('Email is required')
        return jsonify({'success': False, 'message': 'Email is required.'}), 400

    # Check if user already exists
    response = supabase.table('users').select('*').eq('email', email).execute()
    users = response.data
    
    if response.data and len(users) > 0:
        print(f'Email already in use: {email}')
        return jsonify({'success': False, 'message': 'Email already in use. Please try logging in.'}), 409

    otp = str(random.randint(100000, 999999))
    expires_at = (datetime.datetime.utcnow() + datetime.timedelta(minutes=5)).isoformat()
    
    print(f'Generated OTP: {otp} Expires at: {expires_at}')

    # Insert or update OTP
    otp_data = {
        'email': email,
        'otp_code': otp,
        'expires_at': expires_at
    }
    
    try:
        supabase.table('otps').upsert(otp_data, on_conflict='email').execute()
        print('OTP stored successfully')
        
        template_path = os.path.join(current_app.static_folder, 'templates', 'otp_email.html')
        with open(template_path, 'r', encoding='utf-8') as f:
            email_html = f.read()
        
        email_html = email_html.replace('{{OTP_CODE}}', otp)
        
        send_mail(
            to_email=email,
            subject='Your OTP for Registration',
            html_content=email_html,
            text_content=f'Your One-Time Password (OTP) is: {otp}. It is valid for 5 minutes. Do not share this with anyone.'
        )
        
        print(f'OTP email sent successfully to: {email}')
        return jsonify({'success': True, 'message': f'OTP sent successfully to {email}'})
        
    except Exception as e:
        print(f'Error processing OTP request: {e}')
        return jsonify({'success': False, 'message': f'An error occurred: {str(e)}'}), 500

def request_password_reset_otp():
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({'success': False, 'message': 'Email is required.'}), 400

    # Check if user exists
    response = supabase.table('users').select('id').eq('email', email).execute()
    users = response.data

    if not users or len(users) == 0:
        return jsonify({'success': False, 'message': 'Email not found.'}), 404

    otp = str(random.randint(100000, 999999))
    expires_at = (datetime.datetime.utcnow() + datetime.timedelta(minutes=5)).isoformat()

    # Insert or update OTP
    otp_data = {
        'email': email,
        'otp_code': otp,
        'expires_at': expires_at
    }

    try:
        supabase.table('otps').upsert(otp_data, on_conflict='email').execute()
        
        template_path = os.path.join(current_app.static_folder, 'templates', 'forgot_password_otp_email.html')
        with open(template_path, 'r', encoding='utf-8') as f:
            email_html = f.read()
            
        email_html = email_html.replace('{{OTP_CODE}}', otp)

        send_mail(
            to_email=email,
            subject='Password Reset OTP',
            html_content=email_html,
            text_content=f'Your One-Time Password (OTP) for password reset is: {otp}. It is valid for 5 minutes. Do not share this with anyone.'
        )
        return jsonify({'success': True, 'message': f'Password reset OTP sent successfully to {email}'})
    except Exception as e:
        print(f'Error sending password reset email: {e}')
        return jsonify({'success': False, 'message': f'Failed to send password reset OTP. Error: {str(e)}'}), 500

def verify_otp_and_register():
    data = request.get_json()
    firstname = data.get('firstname')
    middlename = data.get('middlename')
    lastname = data.get('lastname')
    email = data.get('email')
    password = data.get('password')
    otp = data.get('otp')
    
    print(f'Registration attempt for email: {email}')

    if not all([firstname, lastname, email, password, otp]):
        print('Missing required fields')
        return jsonify({'success': False, 'message': 'All fields including OTP are required.'}), 400

    # Get OTP from database
    response = supabase.table('otps').select('otp_code, expires_at').eq('email', email).execute()
    otps = response.data

    if not otps or len(otps) == 0:
        print(f'No OTP found for email: {email}')
        return jsonify({'success': False, 'message': 'Invalid or expired OTP.'}), 400

    stored_otp = otps[0]
    current_time = datetime.datetime.utcnow()
    expires_at = datetime.datetime.fromisoformat(stored_otp['expires_at'].replace('Z', '+00:00')).replace(tzinfo=None) # Handle ISO format

    print(f"Stored OTP: {stored_otp['otp_code']}, Provided OTP: {otp}")

    if stored_otp['otp_code'] != otp:
        print('OTP mismatch')
        return jsonify({'success': False, 'message': 'Invalid OTP. Please try again.'}), 400
    
    if current_time > expires_at:
        print('OTP expired')
        supabase.table('otps').delete().eq('email', email).execute()
        return jsonify({'success': False, 'message': 'OTP has expired. Please request a new one.'}), 400

    # Check if email already exists (double check)
    user_check = supabase.table('users').select('*').eq('email', email).execute()
    if user_check.data and len(user_check.data) > 0:
        print(f'Email already in use: {email}')
        return jsonify({'success': False, 'message': 'Email already in use.'}), 409

    # Hash password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Insert user
    new_user_data = {
        'firstname': firstname,
        'middlename': middlename,
        'lastname': lastname,
        'email': email,
        'password': hashed_password,
        'profilepicture': 'https://nttadnyxpbuwuhgtpvjh.supabase.co/storage/v1/object/public/images/default-profile.png'
    }

    try:
        insert_response = supabase.table('users').insert(new_user_data).execute()
        new_user = insert_response.data[0]
        print(f'User inserted successfully: {new_user}')

        # Delete OTP
        supabase.table('otps').delete().eq('email', email).execute()

        # Generate Token
        access_token = jwt.encode({
            'id': new_user['id'],
            'email': email,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        }, Config.JWT_SECRET, algorithm="HS256")

        return jsonify({'success': True, 'message': 'Registration successful!', 'token': access_token})

    except Exception as e:
        print(f'Error inserting user: {e}')
        return jsonify({'success': False, 'message': 'An error occurred during registration.'}), 500

def verify_password_reset_otp():
    data = request.get_json()
    email = data.get('email')
    otp = data.get('otp')

    if not email or not otp:
        return jsonify({'success': False, 'message': 'Email and OTP are required.'}), 400

    response = supabase.table('otps').select('otp_code, expires_at').eq('email', email).execute()
    otps = response.data

    if not otps or len(otps) == 0:
        return jsonify({'success': False, 'message': 'Invalid or expired OTP.'}), 400

    stored_otp = otps[0]
    current_time = datetime.datetime.utcnow()
    expires_at = datetime.datetime.fromisoformat(stored_otp['expires_at'].replace('Z', '+00:00')).replace(tzinfo=None)

    if stored_otp['otp_code'] != otp or current_time > expires_at:
        return jsonify({'success': False, 'message': 'Invalid or expired OTP.'}), 400

    # Delete OTP
    supabase.table('otps').delete().eq('email', email).execute()

    return jsonify({'success': True, 'message': 'OTP verified successfully. You can now reset your password.'})

def reset_password():
    data = request.get_json()
    email = data.get('email')
    new_password = data.get('newPassword')
    confirm_new_password = data.get('confirmNewPassword')

    if not all([email, new_password, confirm_new_password]):
        return jsonify({'success': False, 'message': 'All fields are required.'}), 400

    if new_password != confirm_new_password:
        return jsonify({'success': False, 'message': 'New password and confirm password do not match.'}), 400

    hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    try:
        supabase.table('users').update({'password': hashed_password}).eq('email', email).execute()
        supabase.table('users').update({'token': None}).eq('email', email).execute() # Clear token
        
        return jsonify({'success': True, 'message': 'Password has been reset successfully! Please log in with your new password.'})
    except Exception as e:
        print(f'Error updating password: {e}')
        return jsonify({'success': False, 'message': 'An error occurred while resetting password.'}), 500

def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    print(f'Login attempt for email: {email}')

    response = supabase.table('users').select('*').eq('email', email).execute()
    users = response.data

    if not users or len(users) == 0:
        return jsonify({'success': False, 'message': 'Invalid credentials!'}), 401

    user = users[0]
    
    if bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
        access_token = jwt.encode({
            'id': user['id'],
            'email': user['email'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        }, Config.JWT_SECRET, algorithm="HS256")

        # Update token in DB
        try:
            supabase.table('users').update({'token': access_token}).eq('id', user['id']).execute()
            return jsonify({
                'success': True,
                'message': 'Login successful!',
                'token': access_token
            })
        except Exception as e:
            print(f'Error storing token in DB: {e}')
            return jsonify({'success': False, 'message': 'An error occurred during login.'}), 500
    else:
        return jsonify({'success': False, 'message': 'Invalid credentials!'}), 401

def logout():
    # User is injected by token_required decorator into g.user
    from flask import g
    user_id = g.user['id']

    try:
        supabase.table('users').update({'token': None}).eq('id', user_id).execute()
        return jsonify({'success': True, 'message': 'Logout successful!'})
    except Exception as e:
        print(f'Error clearing token from DB on logout: {e}')
        return jsonify({'success': False, 'message': 'An error occurred during logout.'}), 500
