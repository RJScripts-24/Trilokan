import os
import logging
import time
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from pathlib import Path

# Load environment variables from root .env file
try:
    from dotenv import load_dotenv
    root_env = Path(__file__).parent.parent.parent / '.env'
    load_dotenv(dotenv_path=root_env)
except ImportError:
    pass  # dotenv not installed, will use system environment variables

# --- Module Imports ---
try:
    from modules.face_processor import analyze_face
    from modules.voice_processor import analyze_voice
    from modules.doc_processor import analyze_document
except ImportError:
    logging.error("Could not import modules. Make sure 'modules/face_processor.py', 'modules/voice_processor.py', and 'modules/doc_processor.py' exist.")
    def analyze_face(path): return {'status': 'error', 'message': 'face_processor module not found'}
    def analyze_voice(path): return {'status': 'error', 'message': 'voice_processor module not found'}
    def analyze_document(path): return {'status': 'error', 'message': 'doc_processor module not found'}

# --- Phase 2: Pipeline Imports ---
try:
    from pipeline.orchestrator import orchestrate_verification
    from pipeline.stage1 import run_stage1
    from pipeline.stage2 import run_stage2
    from models.policy_engine import get_policy_engine
    from ingest.capture import IngestCapture
    from ops.logging_config import setup_logging
    PHASE2_ENABLED = True
except ImportError as e:
    logging.warning(f"Phase 2 pipeline modules not fully available: {e}")
    PHASE2_ENABLED = False

# --- App Setup ---
app = Flask(__name__)

# --- Configuration ---
UPLOAD_FOLDER = 'temp_uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024 
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# API Key for authentication
API_KEY = os.environ.get('ML_IDENTITY_API_KEY') or os.environ.get('X_API_KEY', 'dev-api-key-identity-verifier')

# Setup logging
if PHASE2_ENABLED:
    try:
        setup_logging()
    except Exception:
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
else:
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

logger = logging.getLogger(__name__)

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
    Public health check endpoint (no auth required).
    Returns machine-readable status for monitoring.
    """
    return jsonify({
        "service": "identity-verifier",
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat() + 'Z'
    }), 200

@app.route('/verify', methods=['POST'])
@require_api_key
def verify_identity():
    """
    Standardized multi-modal verification endpoint.
    Expects 'multipart/form-data' with video, audio, document files.
    Returns standardized JSON response.
    """
    logger.info("Received verification request.")
    
    video_path, audio_path, doc_path = None, None, None
    
    try:
        # Validate required files
        if 'video' not in request.files:
            return jsonify({
                'status': 'error',
                'message': 'Missing "video" file in request'
            }), 400
        if 'audio' not in request.files:
            return jsonify({
                'status': 'error',
                'message': 'Missing "audio" file in request'
            }), 400
        if 'document' not in request.files:
            return jsonify({
                'status': 'error',
                'message': 'Missing "document" file in request'
            }), 400

        video_file = request.files['video']
        audio_file = request.files['audio']
        doc_file = request.files['document']

        # Save files temporarily
        video_filename = secure_filename(f"video_{os.urandom(8).hex()}")
        audio_filename = secure_filename(f"audio_{os.urandom(8).hex()}")
        doc_filename = secure_filename(f"doc_{os.urandom(8).hex()}")

        video_path = os.path.join(app.config['UPLOAD_FOLDER'], video_filename)
        audio_path = os.path.join(app.config['UPLOAD_FOLDER'], audio_filename)
        doc_path = os.path.join(app.config['UPLOAD_FOLDER'], doc_filename)

        video_file.save(video_path)
        audio_file.save(audio_path)
        doc_file.save(doc_path)
        
        logger.info(f"Files saved temporarily to: {video_path}, {audio_path}, {doc_path}")

        # Perform analysis
        logger.info("Starting face analysis...")
        face_result = analyze_face(video_path)
        
        logger.info("Starting voice analysis...")
        voice_result = analyze_voice(audio_path)
        
        logger.info("Starting document analysis...")
        doc_result = analyze_document(doc_path)

        # Calculate confidence and verification status
        is_verified = (
            face_result.get('status') == 'success' and
            voice_result.get('status') == 'success' and
            doc_result.get('status') == 'success'
        )
        
        confidence = 0.0
        if is_verified:
            # Calculate average confidence from sub-modules
            confidences = []
            if 'confidence' in face_result:
                confidences.append(face_result['confidence'])
            if 'confidence' in voice_result:
                confidences.append(voice_result['confidence'])
            if 'confidence' in doc_result:
                confidences.append(doc_result['confidence'])
            confidence = sum(confidences) / len(confidences) if confidences else 0.85
        
        # Standardized response
        response = {
            'status': 'success',
            'result': {
                'identity_verified': is_verified,
                'confidence': round(confidence, 3),
                'details': {
                    'face_analysis': face_result,
                    'voice_analysis': voice_result,
                    'document_analysis': doc_result
                }
            },
            'meta': {
                'service': 'identity-verifier',
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
        }
        
        logger.info(f"Verification complete. Identity verified: {is_verified}, Confidence: {confidence:.3f}")
        return jsonify(response), 200

    except Exception as e:
        logger.error(f"An error occurred during verification: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': 'An internal server error occurred',
            'details': str(e),
            'meta': {
                'service': 'identity-verifier',
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
        }), 500
        
    finally:
        cleanup_files([video_path, audio_path, doc_path])


@app.route('/verify/identity', methods=['POST'])
@require_api_key
def verify_identity_phase2():
    """
    Phase 2: Full pipeline verification with CNN deepfake detection, fusion scoring, and policy engine.
    
    Accepts:
      - JSON body with 'video_path' (existing file), OR
      - Multipart with 'video' file upload
    
    Optional JSON fields:
      - user_id: str
      - action: str (login, profile_update, high_value_tx)
      - model_name: str (xception, efficientnet)
    
    Returns:
      {
        "overall_pass": bool,
        "final_score": float,
        "video_fake_prob": float,
        "deepfake_pass": bool,
        "liveness_passed": bool,
        "blur_score": float,
        "reason": str,
        "audit_id": str,
        "processing_ms": float,
        "policy_decision": str,
        "risk_category": str
      }
    """
    if not PHASE2_ENABLED:
        return jsonify({'error': 'Phase 2 pipeline not available'}), 501
    
    logger.info("Received Phase 2 identity verification request.")
    
    video_path = None
    temp_file = False
    start_time = time.time()
    
    try:
        # Parse request
        if request.is_json:
            data = request.get_json()
            video_path = data.get('video_path')
            if not video_path or not os.path.exists(video_path):
                return jsonify({'error': 'Invalid or missing video_path in JSON body'}), 400
            user_id = data.get('user_id', 'anonymous')
            action = data.get('action', 'login')
            model_name = data.get('model_name', 'xception')
        else:
            # Multipart file upload
            if 'video' not in request.files:
                return jsonify({'error': 'Missing "video" file in multipart request'}), 400
            
            video_file = request.files['video']
            video_filename = secure_filename(f"video_{os.urandom(8).hex()}.mp4")
            video_path = os.path.join(app.config['UPLOAD_FOLDER'], video_filename)
            video_file.save(video_path)
            temp_file = True
            
            user_id = request.form.get('user_id', 'anonymous')
            action = request.form.get('action', 'login')
            model_name = request.form.get('model_name', 'xception')
        
        logger.info(f"Processing video: {video_path} for user: {user_id}, action: {action}")
        
        # Create capture object
        capture = IngestCapture(video_path=video_path)
        
        # Stage 1: Lightweight checks
        logger.info("Running stage 1 checks...")
        stage1_result = run_stage1(capture)
        
        if not stage1_result.get('pass', False):
            logger.warning(f"Stage 1 failed: {stage1_result.get('reason')}")
            return jsonify({
                'overall_pass': False,
                'reason': stage1_result.get('reason', 'Stage 1 checks failed'),
                'audit_id': stage1_result.get('audit_id'),
                'processing_ms': (time.time() - start_time) * 1000
            }), 200
        
        # Stage 2: ML/DL checks with deepfake detection
        logger.info("Running stage 2 checks (deepfake + fusion)...")
        context = {'user_id': user_id, 'action': action, 'model_name': model_name}
        stage2_result = run_stage2(capture, stage1_result, video_path, context)
        
        # Policy Engine
        logger.info("Applying policy engine...")
        policy = get_policy_engine()
        
        raw_signals = {
            'video_fake_prob': stage2_result.get('video_fake_prob', 0.0),
            'liveness_ok': stage2_result.get('signals', {}).get('liveness_ok', True),
            'blur_score': stage2_result.get('signals', {}).get('blur_score', 100.0),
            'rppg_ok': stage2_result.get('signals', {}).get('rppg_ok', True)
        }
        
        policy_result = policy.apply_policy(
            fused_score=stage2_result.get('final_score', 0.0),
            raw_signals=raw_signals,
            context=context
        )
        
        # Build final response
        response = {
            'overall_pass': stage2_result.get('overall_pass', False),
            'final_score': stage2_result.get('final_score', 0.0),
            'video_fake_prob': stage2_result.get('video_fake_prob', 0.0),
            'deepfake_pass': stage2_result.get('deepfake_pass', False),
            'liveness_passed': stage2_result.get('signals', {}).get('liveness_ok', False),
            'blur_score': stage2_result.get('signals', {}).get('blur_score', 0.0),
            'reason': policy_result.get('reasons', ['Unknown'])[0],
            'audit_id': stage2_result.get('audit_id'),
            'processing_ms': (time.time() - start_time) * 1000,
            'policy_decision': policy_result.get('final_decision'),
            'risk_category': policy_result.get('risk_category'),
            'action_code': policy_result.get('action_code')
        }
        
        logger.info(f"Verification complete: {response['policy_decision']} (score={response['final_score']:.3f})")
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error during Phase 2 verification: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error during verification',
            'details': str(e),
            'processing_ms': (time.time() - start_time) * 1000
        }), 500
        
    finally:
        if temp_file and video_path:
            cleanup_files([video_path])

# --- Run the App ---
if __name__ == '__main__':
    # Get port from environment variable or default to 5002
    port = int(os.environ.get('ML_IDENTITY_PORT') or os.environ.get('PORT', 5002))
    logger.info(f"Starting Identity Verifier Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)