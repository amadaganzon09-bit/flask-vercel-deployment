from flask import request, jsonify, g
import bcrypt
import jwt
import datetime
from utils.supabase_client import supabase
from utils.supabase_storage import upload_file_to_supabase, delete_file_from_supabase
from config import Config

def get_user_info():
    user_id = g.user['id']
    print(f'getUserInfo: Fetching user info for user ID: {user_id}')

    try:
        response = supabase.table('users').select('id, firstname, middlename, lastname, email, profilepicture').eq('id', user_id).execute()
        users = response.data

        if users and len(users) > 0:
            user = users[0]
            if not user.get('profilepicture'):
                user['profilepicture'] = 'https://nttadnyxpbuwuhgtpvjh.supabase.co/storage/v1/object/public/images/default-profile.png'
            
            return jsonify({'success': True, 'user': user})
        else:
            return jsonify({'success': False, 'message': 'User not found.'}), 404
    except Exception as e:
        print(f'Error in getUserInfo: {e}')
        return jsonify({'success': False, 'message': 'An error occurred while fetching user information.'}), 500

def update_user_info(id):
    user_id = g.user['id']
    if str(user_id) != str(id):
        return jsonify({'success': False, 'message': 'Unauthorized to update this user.'}), 403

    data = request.get_json()
    firstname = data.get('firstname')
    middlename = data.get('middlename')
    lastname = data.get('lastname')
    email = data.get('email')

    if not all([firstname, lastname, email]):
        return jsonify({'success': False, 'message': 'First name, last name, and email are required.'}), 400

    try:
        supabase.table('users').update({
            'firstname': firstname,
            'middlename': middlename,
            'lastname': lastname,
            'email': email
        }).eq('id', user_id).execute()
        
        return jsonify({'success': True, 'message': 'Account information updated successfully!'})
    except Exception as e:
        print(f'Error updating user info: {e}')
        return jsonify({'success': False, 'message': 'Error updating user information.'}), 500

def upload_profile_picture():
    user_id = g.user['id']
    if 'profilePicture' not in request.files:
        return jsonify({'success': False, 'message': 'No file uploaded.'}), 400

    file = request.files['profilePicture']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected.'}), 400

    try:
        # Get current profile picture
        response = supabase.table('users').select('profilepicture').eq('id', user_id).execute()
        if not response.data:
            return jsonify({'success': False, 'message': 'User not found.'}), 404
            
        current_profile_picture = response.data[0].get('profilepicture')
        
        # Upload new file
        file_content = file.read()
        file_name = f"profile-pictures/{file.filename}"
        
        upload_result = upload_file_to_supabase(file_content, file_name, 'images')
        
        if upload_result['error']:
            print(f"Error uploading: {upload_result['error']}")
            return jsonify({'success': False, 'message': 'Failed to upload profile picture.'}), 500
            
        profile_picture_path = upload_result['publicUrl']
        
        # Delete old file if it exists and is not default
        if current_profile_picture and 'supabase.co/storage' in current_profile_picture and 'default-profile.png' not in current_profile_picture:
            try:
                # Extract path from URL
                # URL: https://.../storage/v1/object/public/images/path/to/file
                parts = current_profile_picture.split('/public/images/')
                if len(parts) > 1:
                    old_file_path = parts[1]
                    delete_file_from_supabase(old_file_path, 'images')
            except Exception as e:
                print(f"Error deleting old file: {e}")

        # Update user record
        supabase.table('users').update({'profilepicture': profile_picture_path}).eq('id', user_id).execute()
        
        return jsonify({'success': True, 'message': 'Profile picture updated successfully!', 'profilepicture': profile_picture_path})

    except Exception as e:
        print(f'Error in uploadProfilePicture: {e}')
        return jsonify({'success': False, 'message': 'Error saving profile picture.'}), 500

def get_profile_picture():
    user_id = g.user['id']
    try:
        response = supabase.table('users').select('profilepicture').eq('id', user_id).execute()
        if response.data:
            profile_picture = response.data[0].get('profilepicture')
            if not profile_picture:
                profile_picture = 'https://nttadnyxpbuwuhgtpvjh.supabase.co/storage/v1/object/public/images/default-profile.png'
            return jsonify({'success': True, 'profilepicture': profile_picture})
        else:
            return jsonify({'success': False, 'message': 'User not found.'}), 404
    except Exception as e:
        print(f'Error in getProfilePicture: {e}')
        return jsonify({'success': False, 'message': 'An unexpected error occurred.'}), 500

def verify_current_password():
    user_id = g.user['id']
    data = request.get_json()
    current_password = data.get('currentPassword')

    if not current_password:
        return jsonify({'success': False, 'message': 'Current password is required.'}), 400

    try:
        response = supabase.table('users').select('password').eq('id', user_id).execute()
        if not response.data:
            return jsonify({'success': False, 'message': 'User not found.'}), 404
            
        hashed_password = response.data[0]['password']
        if bcrypt.checkpw(current_password.encode('utf-8'), hashed_password.encode('utf-8')):
            return jsonify({'success': True, 'message': 'Current password matches.'})
        else:
            return jsonify({'success': False, 'message': 'Current password does not match.'}), 401
    except Exception as e:
        print(f'Error verifying password: {e}')
        return jsonify({'success': False, 'message': 'An error occurred.'}), 500

def change_password():
    user_id = g.user['id']
    user_email = g.user['email']
    data = request.get_json()
    current_password = data.get('currentPassword')
    new_password = data.get('newPassword')
    confirm_new_password = data.get('confirmNewPassword')

    if not all([current_password, new_password, confirm_new_password]):
        return jsonify({'success': False, 'message': 'All password fields are required.'}), 400

    if new_password != confirm_new_password:
        return jsonify({'success': False, 'message': 'New password and confirm password do not match.'}), 400

    try:
        # Verify current password
        response = supabase.table('users').select('password').eq('id', user_id).execute()
        if not response.data:
            return jsonify({'success': False, 'message': 'User not found.'}), 404
            
        hashed_password = response.data[0]['password']
        if not bcrypt.checkpw(current_password.encode('utf-8'), hashed_password.encode('utf-8')):
            return jsonify({'success': False, 'message': 'Invalid current password.'}), 401

        # Hash new password
        new_hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Update password
        supabase.table('users').update({'password': new_hashed_password}).eq('id', user_id).execute()
        
        # Generate new token
        new_access_token = jwt.encode({
            'id': user_id,
            'email': user_email,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        }, Config.JWT_SECRET, algorithm="HS256")
        
        supabase.table('users').update({'token': new_access_token}).eq('id', user_id).execute()
        
        return jsonify({'success': True, 'message': 'Password changed successfully!', 'token': new_access_token})

    except Exception as e:
        print(f'Error changing password: {e}')
        return jsonify({'success': False, 'message': 'An error occurred while changing password.'}), 500
