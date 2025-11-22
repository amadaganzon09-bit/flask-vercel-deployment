from flask import request, jsonify, g
from utils.supabase_client import supabase
from utils.supabase_storage import upload_file_to_supabase, delete_file_from_supabase

def create_account():
    user_id = g.user['id']
    
    # Handle multipart/form-data
    site = request.form.get('site')
    username = request.form.get('username')
    password = request.form.get('password')
    
    if not all([site, username, password]):
        return jsonify({'success': False, 'message': 'Site, username, and password are required.'}), 400

    image_path = 'https://nttadnyxpbuwuhgtpvjh.supabase.co/storage/v1/object/public/images/default.png'
    
    if 'image' in request.files:
        file = request.files['image']
        if file.filename != '':
            try:
                file_content = file.read()
                file_name = f"accounts/{file.filename}"
                upload_result = upload_file_to_supabase(file_content, file_name, 'images')
                
                if upload_result['error']:
                    print(f"Error uploading image: {upload_result['error']}")
                    return jsonify({'success': False, 'message': 'Failed to upload image.'}), 500
                
                image_path = upload_result['publicUrl']
            except Exception as e:
                print(f"Error reading file: {e}")
                
    try:
        response = supabase.table('accounts').insert({
            'site': site,
            'username': username,
            'password': password,
            'image': image_path,
            'user_id': user_id
        }).execute()
        
        if response.data:
            return jsonify({'success': True, 'message': 'Account created successfully!', 'accountId': response.data[0]['id']})
        else:
            return jsonify({'success': False, 'message': 'Error creating account.'}), 500
            
    except Exception as e:
        print(f'Error creating account: {e}')
        return jsonify({'success': False, 'message': 'Error creating account.'}), 500

def get_accounts():
    user_id = g.user['id']
    try:
        response = supabase.table('accounts').select('id, site, username, password, image').eq('user_id', user_id).execute()
        
        accounts = response.data
        # Process accounts to ensure image paths are correct (similar to JS logic)
        for account in accounts:
            if not account.get('image'):
                account['image'] = 'https://nttadnyxpbuwuhgtpvjh.supabase.co/storage/v1/object/public/images/default.png'
        
        return jsonify({'success': True, 'message': 'Accounts retrieved successfully!', 'accounts': accounts})
    except Exception as e:
        print(f'Error reading accounts: {e}')
        return jsonify({'success': False, 'message': 'Error reading accounts.'}), 500

def update_account(id):
    user_id = g.user['id']
    account_id = id
    
    site = request.form.get('site')
    username = request.form.get('username')
    password = request.form.get('password')
    
    if not all([site, username, password]):
        return jsonify({'success': False, 'message': 'Site, username, and password are required.'}), 400

    try:
        # Get current account
        response = supabase.table('accounts').select('image').eq('id', account_id).eq('user_id', user_id).execute()
        if not response.data:
            return jsonify({'success': False, 'message': 'Account not found or you do not have permission to update it.'}), 404
            
        current_image = response.data[0].get('image')
        image_path = current_image or 'https://nttadnyxpbuwuhgtpvjh.supabase.co/storage/v1/object/public/images/default.png'
        
        if 'image' in request.files:
            file = request.files['image']
            if file.filename != '':
                file_content = file.read()
                file_name = f"accounts/{file.filename}"
                upload_result = upload_file_to_supabase(file_content, file_name, 'images')
                
                if upload_result['error']:
                    print(f"Error uploading image: {upload_result['error']}")
                    return jsonify({'success': False, 'message': 'Failed to upload image.'}), 500
                
                image_path = upload_result['publicUrl']
                
                # Delete old image if it exists and is not default
                if current_image and 'supabase.co/storage' in current_image and 'default.png' not in current_image:
                     try:
                        parts = current_image.split('/public/images/')
                        if len(parts) > 1:
                            old_file_path = parts[1]
                            delete_file_from_supabase(old_file_path, 'images')
                     except Exception as e:
                        print(f"Error deleting old file: {e}")
        
        elif request.form.get('image') == 'images/default.png' or request.form.get('image') == 'https://nttadnyxpbuwuhgtpvjh.supabase.co/storage/v1/object/public/images/default.png':
             image_path = 'https://nttadnyxpbuwuhgtpvjh.supabase.co/storage/v1/object/public/images/default.png'
             # Delete old image logic here as well if needed
             if current_image and 'supabase.co/storage' in current_image and 'default.png' not in current_image:
                 try:
                    parts = current_image.split('/public/images/')
                    if len(parts) > 1:
                        old_file_path = parts[1]
                        delete_file_from_supabase(old_file_path, 'images')
                 except Exception as e:
                    print(f"Error deleting old file: {e}")

        # Update account
        supabase.table('accounts').update({
            'site': site,
            'username': username,
            'password': password,
            'image': image_path
        }).eq('id', account_id).eq('user_id', user_id).execute()
        
        return jsonify({'success': True, 'message': 'Account updated successfully!'})

    except Exception as e:
        print(f'Error updating account: {e}')
        return jsonify({'success': False, 'message': 'Error updating account.'}), 500

def delete_account(id):
    user_id = g.user['id']
    account_id = id

    try:
        # Get account to delete image
        response = supabase.table('accounts').select('image').eq('id', account_id).eq('user_id', user_id).execute()
        if not response.data:
            return jsonify({'success': False, 'message': 'Account not found or you do not have permission to delete it.'}), 404
            
        account_image = response.data[0].get('image')
        
        # Delete account
        supabase.table('accounts').delete().eq('id', account_id).eq('user_id', user_id).execute()
        
        # Delete image
        if account_image and 'supabase.co/storage' in account_image and 'default.png' not in account_image:
             try:
                parts = account_image.split('/public/images/')
                if len(parts) > 1:
                    old_file_path = parts[1]
                    delete_file_from_supabase(old_file_path, 'images')
             except Exception as e:
                print(f"Error deleting old file: {e}")

        return jsonify({'success': True, 'message': 'Account deleted successfully!'})

    except Exception as e:
        print(f'Error deleting account: {e}')
        return jsonify({'success': False, 'message': 'Error deleting account.'}), 500
