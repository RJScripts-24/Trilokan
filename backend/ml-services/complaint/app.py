import os
import logging
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from pathlib import Path

# Load environment variables from root .env file
try:
    from dotenv import load_dotenv
    root_env = Path(__file__).parent.parent.parent / '.env'
    load_dotenv(dotenv_path=root_env)
except ImportError:
    pass  # dotenv not installed, will use system environment variables

# Import logic from the modules directory (to be created next)
# We assume these modules will export specific functions
try:
    from modules.nlp import categorize_complaint
    from modules.chatbot import get_bot_response
    from modules.transcription import transcribe_audio_file
    from modules.deepfake import detect_deepfake_video
except ImportError:
    # Fallback for when running app.py before modules are fully created
    print("Warning: Modules not found. Ensure modules/nlp.py, modules/chatbot.py, modules/transcription.py, and modules/deepfake.py exist.")
    def categorize_complaint(text): return {"categories": [{"name": "General", "confidence": 0.5}], "priority": "Low", "confidence": 0.0}
    def get_bot_response(msg, uid): return "System modules are initializing."
    def transcribe_audio_file(path): return {"text": "Transcription module not available"}
    def detect_deepfake_video(path): return {"score": 0.0, "label": "unknown"}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask App
app = Flask(__name__)
CORS(app)  # Enable CORS to allow requests from the React frontend

# Configuration
UPLOAD_FOLDER = 'temp_uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# API Key for authentication
API_KEY = os.environ.get('ML_COMPLAINT_API_KEY') or os.environ.get('X_API_KEY', 'dev-api-key-complaint-service')

# --- Authentication Decorator ---
def require_api_key(f):
    """Decorator to validate x-api-key header"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('x-api-key')
        if not api_key or api_key != API_KEY:
            logger.warning(f"Unauthorized access attempt from {request.remote_addr}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized - Invalid or missing x-api-key'
            }), 401
        return f(*args, **kwargs)
    return decorated_function

# Helper function for cleanup
def cleanup_files(paths):
    """Delete temporary files after processing"""
    for path in paths:
        if path and os.path.exists(path):
            try:
                os.remove(path)
                logger.info(f"Cleaned up file: {path}")
            except Exception as e:
                logger.error(f"Error cleaning up file {path}: {e}")

@app.route('/', methods=['GET'])
def index():
    """Root endpoint to verify the service is running."""
    return jsonify({
        "service": "Grievance AI Service",
        "status": "active",
        "version": "1.0.0"
    }), 200

@app.route('/health', methods=['GET'])
def health_check():
    """
    Public health check endpoint (no auth required).
    Returns machine-readable status for monitoring.
    """
    return jsonify({
        "service": "complaint-ml-service",
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat() + 'Z'
    }), 200

@app.route('/api/v1/categorize', methods=['POST'])
@require_api_key
def categorize_complaint_endpoint():
    """
    Endpoint to analyze and categorize a complaint.
    Expected JSON payload: { "text": "I lost money in a fake app scam..." }
    Returns standardized response with categories and confidence scores.
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            logger.warning("Categorization request missing 'text' field")
            return jsonify({
                "status": "error",
                "message": "Missing 'text' field in request body"
            }), 400

        complaint_text = data['text']
        logger.info(f"Processing complaint categorization. Length: {len(complaint_text)}")

        # Call the NLP module to process the text
        result = categorize_complaint(complaint_text)
        
        # Ensure result has the expected structure
        if 'categories' not in result:
            # Convert old format to new format
            categories = [{
                "name": result.get('category', 'General'),
                "confidence": result.get('confidence', 0.5)
            }]
        else:
            categories = result['categories']

        return jsonify({
            "status": "success",
            "result": {
                "categories": categories,
                "priority": result.get('priority', 'Medium'),
                "keywords": result.get('keywords', [])
            },
            "meta": {
                "service": "complaint-ml-service",
                "timestamp": datetime.utcnow().isoformat() + 'Z'
            }
        }), 200

    except Exception as e:
        logger.error(f"Error in categorization endpoint: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": "Internal server error processing complaint",
            "details": str(e),
            "meta": {
                "service": "complaint-ml-service",
                "timestamp": datetime.utcnow().isoformat() + 'Z'
            }
        }), 500

@app.route('/api/v1/chat', methods=['POST'])
def chat_endpoint():
    """
    Endpoint for the AI Chatbot.
    Expected JSON payload: { "message": "How do I file a fraud report?", "user_id": "123" }
    """
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            logger.warning("Chat request missing 'message' field")
            return jsonify({"error": "Missing 'message' field in request body"}), 400

        user_message = data['message']
        user_id = data.get('user_id', 'anonymous') # Context tracking if needed

        logger.info(f"Received chat message from user {user_id}")

        # Call the Chatbot module to generate a response
        bot_reply = get_bot_response(user_message, user_id)

        return jsonify({
            "success": True,
            "response": bot_reply
        }), 200

    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error in chatbot"}), 500

@app.route('/transcribe', methods=['POST'])
@require_api_key
def transcribe_audio_endpoint():
    """
    Audio transcription endpoint.
    Expects multipart/form-data with 'audio' file.
    Returns transcribed text.
    """
    audio_path = None
    
    try:
        if 'audio' not in request.files:
            logger.warning("Transcription request missing 'audio' file")
            return jsonify({
                "status": "error",
                "message": "Missing 'audio' file in request"
            }), 400
        
        audio_file = request.files['audio']
        audio_filename = secure_filename(f"audio_{os.urandom(8).hex()}")
        audio_path = os.path.join(app.config['UPLOAD_FOLDER'], audio_filename)
        audio_file.save(audio_path)
        
        logger.info(f"Processing audio transcription: {audio_path}")
        
        # Call transcription module
        transcription_result = transcribe_audio_file(audio_path)
        
        return jsonify({
            "status": "success",
            "result": {
                "text": transcription_result.get('text', ''),
                "confidence": transcription_result.get('confidence', 0.0),
                "language": transcription_result.get('language', 'en')
            },
            "meta": {
                "service": "complaint-ml-service",
                "timestamp": datetime.utcnow().isoformat() + 'Z'
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in transcription endpoint: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": "Internal server error during transcription",
            "details": str(e),
            "meta": {
                "service": "complaint-ml-service",
                "timestamp": datetime.utcnow().isoformat() + 'Z'
            }
        }), 500
    
    finally:
        cleanup_files([audio_path])

@app.route('/detect/deepfake', methods=['POST'])
@require_api_key
def detect_deepfake_endpoint():
    """
    Deepfake detection endpoint.
    Expects multipart/form-data with 'video' file.
    Returns deepfake detection result with score and label.
    """
    video_path = None
    
    try:
        if 'video' not in request.files:
            logger.warning("Deepfake detection request missing 'video' file")
            return jsonify({
                "status": "error",
                "message": "Missing 'video' file in request"
            }), 400
        
        video_file = request.files['video']
        video_filename = secure_filename(f"video_{os.urandom(8).hex()}")
        video_path = os.path.join(app.config['UPLOAD_FOLDER'], video_filename)
        video_file.save(video_path)
        
        logger.info(f"Processing deepfake detection: {video_path}")
        
        # Call deepfake detection module
        detection_result = detect_deepfake_video(video_path)
        
        return jsonify({
            "status": "success",
            "result": {
                "score": detection_result.get('score', 0.0),
                "label": detection_result.get('label', 'unknown'),
                "confidence": detection_result.get('confidence', 0.0),
                "is_deepfake": detection_result.get('score', 0.0) > 0.5
            },
            "meta": {
                "service": "complaint-ml-service",
                "timestamp": datetime.utcnow().isoformat() + 'Z'
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in deepfake detection endpoint: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": "Internal server error during deepfake detection",
            "details": str(e),
            "meta": {
                "service": "complaint-ml-service",
                "timestamp": datetime.utcnow().isoformat() + 'Z'
            }
        }), 500
    
    finally:
        cleanup_files([video_path])

if __name__ == '__main__':
    # Get port from environment variable or default to 5000
    port = int(os.environ.get('ML_COMPLAINT_PORT') or os.environ.get('PORT', 5000))
    
    logger.info(f"Starting Grievance AI Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)