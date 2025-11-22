import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    JWT_SECRET = os.environ.get('JWT_SECRET') or 'your-secret-key'
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_KEY = os.environ.get('SUPABASE_KEY')
    BASE_URL = os.environ.get('BASE_URL') or 'http://localhost:5000'
