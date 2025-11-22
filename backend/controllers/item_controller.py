from flask import request, jsonify, g
from utils.supabase_client import supabase

def create_item():
    user_id = g.user['id']
    data = request.get_json()
    name = data.get('name')
    description = data.get('description')

    if not name:
        return jsonify({'success': False, 'message': 'Name is required.'}), 400

    try:
        response = supabase.table('items').insert({
            'name': name,
            'description': description,
            'user_id': user_id
        }).execute()
        
        # Supabase returns the inserted data
        if response.data:
            new_item = response.data[0]
            return jsonify({'success': True, 'message': 'Item created successfully!', 'itemId': new_item['id']})
        else:
            return jsonify({'success': False, 'message': 'Failed to create item.'}), 500

    except Exception as e:
        print(f'Error creating item: {e}')
        return jsonify({'success': False, 'message': 'Error creating item.'}), 500

def read_items():
    user_id = g.user['id']
    try:
        response = supabase.table('items').select('*').eq('user_id', user_id).execute()
        return jsonify({'success': True, 'message': 'Items retrieved successfully!', 'items': response.data})
    except Exception as e:
        print(f'Error reading items: {e}')
        return jsonify({'success': False, 'message': 'Error reading items.'}), 500

def update_item():
    user_id = g.user['id']
    data = request.get_json()
    item_id = data.get('id')
    name = data.get('name')
    description = data.get('description')

    if not item_id:
        return jsonify({'success': False, 'message': 'Item ID is required.'}), 400

    try:
        # Check ownership and existence
        # Supabase update returns modified rows, so we can check that
        response = supabase.table('items').update({
            'name': name,
            'description': description
        }).eq('id', item_id).eq('user_id', user_id).execute()

        if response.data and len(response.data) > 0:
            return jsonify({'success': True, 'message': 'Item updated successfully!'})
        else:
            return jsonify({'success': False, 'message': 'Item not found or you do not have permission to update it.'}), 404

    except Exception as e:
        print(f'Error updating item: {e}')
        return jsonify({'success': False, 'message': 'Error updating item.'}), 500

def delete_item():
    user_id = g.user['id']
    data = request.get_json()
    item_id = data.get('id')

    if not item_id:
        return jsonify({'success': False, 'message': 'Item ID is required.'}), 400

    try:
        response = supabase.table('items').delete().eq('id', item_id).eq('user_id', user_id).execute()
        
        if response.data and len(response.data) > 0:
            return jsonify({'success': True, 'message': 'Item deleted successfully!'})
        else:
            return jsonify({'success': False, 'message': 'Item not found or you do not have permission to delete it.'}), 404

    except Exception as e:
        print(f'Error deleting item: {e}')
        return jsonify({'success': False, 'message': 'Error deleting item.'}), 500
