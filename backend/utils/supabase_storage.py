from utils.supabase_client import supabase

def upload_file_to_supabase(file_buffer, file_name, bucket_name='images'):
    try:
        # Supabase Storage upload
        # file_buffer should be bytes
        response = supabase.storage.from_(bucket_name).upload(
            path=file_name,
            file=file_buffer,
            file_options={"content-type": "image/jpeg", "upsert": "true"} # Adjust content-type if needed or detect it
        )
        
        # Get public URL
        public_url_response = supabase.storage.from_(bucket_name).get_public_url(file_name)
        public_url = public_url_response
        
        return {'publicUrl': public_url, 'error': None}
    except Exception as e:
        return {'publicUrl': None, 'error': e}

def delete_file_from_supabase(file_path, bucket_name='images'):
    try:
        response = supabase.storage.from_(bucket_name).remove([file_path])
        return {'error': None}
    except Exception as e:
        return {'error': e}
