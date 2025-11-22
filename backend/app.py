from flask import Flask, send_from_directory
from flask_cors import CORS
import os
from dotenv import load_dotenv
import sys

# Add current directory to path to ensure imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='../frontend', static_url_path='')

# Configure CORS
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Import and register blueprints
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
from routes.item_routes import item_bp
from routes.account_routes import account_bp

app.register_blueprint(auth_bp)
app.register_blueprint(user_bp)
app.register_blueprint(item_bp)
app.register_blueprint(account_bp)

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/dashboard')
def serve_dashboard():
    return send_from_directory(app.static_folder, 'dashboard.html')

@app.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory(os.path.join(app.static_folder, 'images'), filename)

# Vercel requires the app to be exposed as 'app'
# The existing code already does this: app = Flask(...)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
