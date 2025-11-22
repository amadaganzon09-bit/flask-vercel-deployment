from app import app

# This is required for Vercel to detect the Flask app
# Vercel looks for a variable named 'app' in the file specified in vercel.json
# We are pointing vercel.json to app.py directly, but if we needed an api/index.py:
# from http.server import BaseHTTPRequestHandler
# from app import app

# def handler(request, response):
#     return app(request, response)
