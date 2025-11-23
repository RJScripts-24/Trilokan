from flask import Flask, request, jsonify
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'apk'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


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
    app.run(port=5001, debug=True)
