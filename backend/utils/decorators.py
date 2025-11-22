from functools import wraps
from flask import request, jsonify, g
import jwt
from config import Config
from utils.supabase_client import supabase

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'success': False, 'message': 'Token format invalid'}), 401
        
        if not token:
            return jsonify({'success': False, 'message': 'Access token required.'}), 401
        
        try:
            payload = jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
            user_id = payload['id']
            
            # Verify token in Supabase
            response = supabase.table('users').select('id, email').eq('id', user_id).eq('token', token).execute()
            
            if not response.data or len(response.data) == 0:
                 return jsonify({'success': False, 'message': 'Invalid token. Please log in again.'}), 403
            
            g.user = response.data[0]
            
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expired. Please log in again.'}), 403
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token. Please log in again.'}), 403
        except Exception as e:
            print(f"Token verification error: {e}")
            return jsonify({'success': False, 'message': 'An error occurred during token validation.'}), 500
            
        return f(*args, **kwargs)
    
    return decorated
