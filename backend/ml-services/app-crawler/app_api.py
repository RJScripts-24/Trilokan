from flask import Flask, request, jsonify
import os
import hashlib
from datetime import datetime
from functools import wraps
from werkzeug.utils import secure_filename

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'apk'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# API Key for authentication
API_KEY = os.environ.get('X_API_KEY', 'dev-api-key-app-crawler')

# --- Authentication Decorator ---
def require_api_key(f):
    """Decorator to validate x-api-key header"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('x-api-key')
        if not api_key or api_key != API_KEY:
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized - Invalid or missing x-api-key'
            }), 401
        return f(*args, **kwargs)
    return decorated_function


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- Simple analysis stubs ---
import re
from config import TARGET_BRANDS


# Helper: extract package name from Play Store URL
def extract_package_name_from_link(link):
    match = re.search(r'id=([a-zA-Z0-9_.]+)', link)
    if match:
        return match.group(1)
    return None


import tempfile
from app_detector import detect_apk

def analyze_package_name(package_name):
    """
    Analyze package name for safety.
    """
    from config import OFFICIAL_PACKAGE_NAMES
    import difflib
    
    for brand, pkgs in OFFICIAL_PACKAGE_NAMES.items():
        if package_name in pkgs:
            return {
                'status': 'safe',
                'details': f'Official app: {brand} ({package_name})'
            }
    
    for brand, pkgs in OFFICIAL_PACKAGE_NAMES.items():
        for official_pkg in pkgs:
            if package_name != official_pkg:
                ratio = difflib.SequenceMatcher(None, package_name, official_pkg).ratio()
                if ratio > 0.8:
                    return {
                        'status': 'suspicious',
                        'details': f'Lookalike detected for {brand}: {package_name} vs {official_pkg} (similarity: {ratio:.2f})'
                    }
    
    return {
        'status': 'fraud',
        'details': f'Unknown or unofficial app: {package_name}'
    }

def calculate_file_hash(filepath):
    """Calculate SHA256 hash of a file"""
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def analyze_playstore_link(link, config=None):
    """
    Predicts risk from Play Store link (package name) and prompts for APK upload for deep analysis.
    """
    package_name = extract_package_name_from_link(link)
    if not package_name:
        return {'status': 'error', 'details': 'Could not extract package name from link.'}

    # Predict basic risk from package name
    from config import OFFICIAL_PACKAGE_NAMES
    import difflib
    for brand, pkgs in OFFICIAL_PACKAGE_NAMES.items():
        if package_name in pkgs:
            return {
                'status': 'safe',
                'details': f'Official app: {brand} ({package_name}). For in-depth analysis, please upload the APK file.'
            }
    for brand, pkgs in OFFICIAL_PACKAGE_NAMES.items():
        for official_pkg in pkgs:
            if package_name != official_pkg:
                ratio = difflib.SequenceMatcher(None, package_name, official_pkg).ratio()
                if ratio > 0.8:
                    return {
                        'status': 'suspicious',
                        'details': f'Lookalike detected for {brand}: {package_name} vs {official_pkg} (ratio: {ratio:.2f}). For in-depth analysis, please upload the APK file.'
                    }
    return {
        'status': 'fraud',
        'details': f'Unknown or unofficial app: {package_name}. For in-depth analysis, please upload the APK file.'
    }

def analyze_apk_file(filepath):
    """
    Placeholder: Checks if any target brand is mentioned in the APK filename (very basic logic).
    """
    filename = os.path.basename(filepath)
    for brand in TARGET_BRANDS:
        if brand.replace(' ', '').lower() in filename.replace(' ', '').lower():
            return {'status': 'safe', 'details': f'Brand {brand} found in APK filename.'}
    return {'status': 'fraud', 'details': 'No known brand found in APK filename.'}

@app.route('/health', methods=['GET'])
def health_check():
    """
    Public health check endpoint (no auth required).
    Returns machine-readable status for monitoring.
    """
    return jsonify({
        "service": "app-crawler",
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat() + 'Z'
    }), 200

@app.route('/app/verify', methods=['POST'])
@require_api_key
def verify_app():
    """
    App verification endpoint expected by gateway.
    Accepts APK file or package info and returns verification result.
    """
    filepath = None
    
    try:
        # Check for Play Store link
        playstore_link = request.form.get('playstore_link')
        package_name = request.form.get('package_name')
        
        if playstore_link:
            result = analyze_playstore_link(playstore_link)
            return jsonify({
                'status': 'success',
                'result': {
                    'package_match': result.get('status') == 'safe',
                    'verdict': result.get('status'),
                    'details': result.get('details'),
                    'analysis_type': 'package_name'
                },
                'meta': {
                    'service': 'app-crawler',
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                }
            }), 200
        
        if package_name:
            result = analyze_package_name(package_name)
            return jsonify({
                'status': 'success',
                'result': {
                    'package_match': result.get('status') == 'safe',
                    'verdict': result.get('status'),
                    'details': result.get('details'),
                    'analysis_type': 'package_name'
                },
                'meta': {
                    'service': 'app-crawler',
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                }
            }), 200

        # Check for APK file upload
        if 'apk_file' in request.files or 'apk' in request.files:
            file = request.files.get('apk_file') or request.files.get('apk')
            
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                
                # Calculate file hash
                file_hash = calculate_file_hash(filepath)
                
                apk_result = analyze_apk_file(filepath)
                
                return jsonify({
                    'status': 'success',
                    'result': {
                        'package_match': apk_result.get('status') == 'safe',
                        'verdict': apk_result.get('status'),
                        'details': apk_result.get('details'),
                        'hashes': {
                            'sha256': file_hash
                        },
                        'analysis_type': 'apk_file'
                    },
                    'meta': {
                        'service': 'app-crawler',
                        'timestamp': datetime.utcnow().isoformat() + 'Z'
                    }
                }), 200
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'Invalid file type. Only APK files are allowed.'
                }), 400

        return jsonify({
            'status': 'error',
            'message': 'No Play Store link, package name, or APK file provided'
        }), 400
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'Internal server error during app verification',
            'details': str(e),
            'meta': {
                'service': 'app-crawler',
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
        }), 500
    
    finally:
        # Cleanup uploaded file
        if filepath and os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass

@app.route('/check_app', methods=['POST'])
def check_app():
    # Check for Play Store link
    playstore_link = request.form.get('playstore_link')
    if playstore_link:
        result = analyze_playstore_link(playstore_link)
        return jsonify(result)

    # Check for APK file upload
    if 'apk_file' in request.files:
        file = request.files['apk_file']
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            result = analyze_apk_file(filepath)
            return jsonify(result)
        else:
            return jsonify({'error': 'Invalid file type'}), 400

    return jsonify({'error': 'No Play Store link or APK file provided'}), 400

if __name__ == '__main__':
    # Get port from environment variable or default to 5001
    port = int(os.environ.get('PORT', 5001))
    print(f"Starting App Crawler API Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)
