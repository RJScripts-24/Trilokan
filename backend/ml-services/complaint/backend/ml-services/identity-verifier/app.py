import os
import logging
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename

# --- Module Imports ---
# We are importing the processing functions from your 'modules' directory.
# We'll assume each function takes a file path as input and returns a
# dictionary with its analysis results.
try:
    from modules.face_processor import analyze_face
    from modules.voice_processor import analyze_voice
    from modules.doc_processor import analyze_document
except ImportError:
    logging.error("Could not import modules. Make sure 'modules/face_processor.py', 'modules/voice_processor.py', and 'modules/doc_processor.py' exist.")
    # In a real app, you might want to exit, but for setup, we can define stubs.
    def analyze_face(path): return {'status': 'error', 'message': 'face_processor module not found'}
    def analyze_voice(path): return {'status': 'error', 'message': 'voice_processor module not found'}
    def analyze_document(path): return {'status': 'error', 'message': 'doc_processor module not found'}

# --- App Setup ---
app = Flask(__name__)

# --- Configuration ---
# Create a temporary folder to store uploaded files before processing
UPLOAD_FOLDER = 'temp_uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# Set a limit on the file size (e.g., 50MB)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024 

# Ensure the upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Helper Function ---
def cleanup_files(paths):
    """
    Deletes temporary files after processing.
    """
    for path in paths:
        if path and os.path.exists(path):
            try:
                os.remove(path)
                logging.info(f"Cleaned up file: {path}")
            except Exception as e:
                logging.error(f"Error cleaning up file {path}: {e}")

# --- API Endpoints ---

@app.route('/health', methods=['GET'])
def health_check():
    """
    A simple health check endpoint to confirm the service is running.
    """
    return jsonify({"status": "healthy", "service": "identity-verifier"}), 200

@app.route('/verify', methods=['POST'])
def verify_identity():
    """
    The main multi-modal verification endpoint.
    It expects a 'multipart/form-data' request with:
    - 'video': A video file for face and liveness analysis.
    - 'audio': An audio file for voice spoofing analysis.
    - 'document': An image file of an ID (e.g., driver's license).
    """
    logging.info("Received new verification request.")
    
    video_path, audio_path, doc_path = None, None, None
    
    try:
        # --- 1. Check for required files ---
        if 'video' not in request.files:
            return jsonify({'error': 'Missing "video" file in request'}), 400
        if 'audio' not in request.files:
            return jsonify({'error': 'Missing "audio" file in request'}), 400
        if 'document' not in request.files:
            return jsonify({'error': 'Missing "document" file in request'}), 400

        video_file = request.files['video']
        audio_file = request.files['audio']
        doc_file = request.files['document']

        # --- 2. Save files securely ---
        video_filename = secure_filename(f"video_{os.urandom(8).hex()}")
        audio_filename = secure_filename(f"audio_{os.urandom(8).hex()}")
        doc_filename = secure_filename(f"doc_{os.urandom(8).hex()}")

        video_path = os.path.join(app.config['UPLOAD_FOLDER'], video_filename)
        audio_path = os.path.join(app.config['UPLOAD_FOLDER'], audio_filename)
        doc_path = os.path.join(app.config['UPLOAD_FOLDER'], doc_filename)

        video_file.save(video_path)
        audio_file.save(audio_path)
        doc_file.save(doc_path)
        
        logging.info(f"Files saved temporarily to: {video_path}, {audio_path}, {doc_path}")

        # --- 3. Run AI/ML Processing ---
        # Each 'analyze' function is expected to return a dictionary.
        # e.g., {'status': 'success', 'is_deepfake': False, 'liveness_score': 0.95}
        
        logging.info("Starting face analysis...")
        face_result = analyze_face(video_path)
        
        logging.info("Starting voice analysis...")
        voice_result = analyze_voice(audio_path)
        
        logging.info("Starting document analysis...")
        doc_result = analyze_document(doc_path)

        # --- 4. Aggregate Results ---
        # This is the final JSON response that will be sent to the React frontend.
        
        # Determine the overall status. For a hackathon, a simple "all pass" rule works.
        is_verified = (
            face_result.get('status') == 'success' and
            voice_result.get('status') == 'success' and
            doc_result.get('status') == 'success'
        )
        
        final_result = {
            'overall_status': 'success' if is_verified else 'failed',
            'checks': {
                'face_analysis': face_result,
                'voice_analysis': voice_result,
                'document_analysis': doc_result
            }
        }
        
        logging.info(f"Verification complete. Overall status: {final_result['overall_status']}")
        return jsonify(final_result), 200

    except Exception as e:
        # Catch-all for any unexpected errors during processing
        logging.error(f"An error occurred during verification: {e}", exc_info=True)
        return jsonify({'error': 'An internal server error occurred', 'details': str(e)}), 500
        
    finally:
        # --- 5. Cleanup ---
        # Always delete the temporary files, whether processing succeeded or failed.
        cleanup_files([video_path, audio_path, doc_path])

# --- Run the App ---
if __name__ == '__main__':
    # Running on 0.0.0.0 makes it accessible from outside the Docker container.
    # Port 5001 is used to avoid conflicts with other services.
    app.run(host='0.0.0.0', port=5001, debug=True)