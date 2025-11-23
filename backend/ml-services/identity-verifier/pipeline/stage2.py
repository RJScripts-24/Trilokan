import numpy as np
import time
import logging
from typing import Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)

# --- Import Models (The "Heavy" Engines) ---
try:
    from models.cnn_deepfake import get_deepfake_cnn
    from models.audio_spoof_detector import get_spoof_detector
    from models.face_embedder import get_face_embedder
    from models.asv import get_asv_model
except ImportError:
    # Mocks for standalone testing without full model weights
    logger.warning("Stage2 Warning: Model modules not found. Using mocks.")
    get_deepfake_cnn = lambda: None
    get_spoof_detector = lambda: None
    get_face_embedder = lambda: None
    get_asv_model = lambda: None

# --- Import New Deepfake Inference Module ---
try:
    from inference.deepfake_inference import run_deepfake_model, aggregate_scores
    DEEPFAKE_AVAILABLE = True
except ImportError:
    logger.warning("Stage2 Warning: Deepfake inference module not available.")
    DEEPFAKE_AVAILABLE = False
    def run_deepfake_model(*args, **kwargs):
        return []
    def aggregate_scores(*args, **kwargs):
        return 0.0

# --- Import Feature Extractors (Advanced Liveness) ---
try:
    from features.rppg import extract_rppg
    from features.optical_flow import flow_consistency
    from features.landmarks import detect_landmarks, landmark_jitter
    from features.lip_sync import lip_sync_score
except ImportError:
    logger.warning("Stage2 Warning: Feature modules not found. Using mocks.")
    def extract_rppg(*args): return {'confidence': 0.0, 'bpm': 0}
    def flow_consistency(*args): return {'value': 0.0}
    def detect_landmarks(*args): return np.zeros((68, 2))
    def landmark_jitter(*args): return {'value': 0.0}
    def lip_sync_score(*args): return {'value': 0.0}

# --- Import Face Processor Helpers ---
try:
    from modules.face_processor import detect_and_crop_faces
except ImportError:
    logger.warning("Stage2 Warning: face_processor module not found.")
    def detect_and_crop_faces(frames):
        # Return empty list if helper not available
        return []

def run_stage2(
    capture: Dict[str, Any], 
    stage1_result: Dict[str, Any] = None,
    video_path: str = None,
    context: dict = None
) -> Dict[str, Any]:
    """
    Executes 'Heavy Checks' using Deep Learning and Signal Processing.

    Checks performed:
    1. Visual Deepfake Detection (CNN) - NEW INTEGRATION
    2. Physiological Liveness (rPPG/Pulse)
    3. Geometric Consistency (Landmark Jitter & Optical Flow)
    4. Audio Security (Anti-Spoofing & Speaker Verification)
    5. Audio-Visual Synchronization (Lip Sync)

    Args:
        capture (dict): Input data {'frames': [], 'audio': [], 'metadata': {}, 'face_boxes': []}
        stage1_result (dict): Output from Stage 1 (for context).
        video_path (str): Optional path to video file for alternative processing
        context (dict): Additional context (user_id, audit_id, etc.)

    Returns:
        dict: Structured result with:
            - video_fake_prob: float - Aggregated deepfake probability
            - deepfake_pass: bool - Whether deepfake check passed
            - final_score: float - Fused risk score
            - overall_pass: bool - Final decision
            - audit_id: str - Tracking ID
            - timestamp: str - ISO8601 timestamp
            - signals: dict - All individual signal values
            - debug: dict - Debug information
    """
    start_time = time.time()
    context = context or {}
    signals = {}
    
    # Generate audit ID
    from pipeline.audit_id import generate_audit_id
    audit_id = context.get('audit_id', generate_audit_id())
    
    # Unpack Data
    frames = capture.get('frames', [])
    audio = capture.get('audio', np.array([]))
    sr = capture.get('sample_rate', 16000)
    user_id = context.get('user_id', capture.get('metadata', {}).get('user_id'))
    
    # Pre-calculated face boxes if available (to save time), else we'd detect them here
    # Assuming 'face_boxes' matches 'frames' length
    face_boxes = capture.get('face_boxes', []) 

    # --- 1. VISUAL DEEPFAKE DETECTION (CNN) - NEW PHASE 2 INTEGRATION ---
    video_fake_prob = 0.0
    deepfake_pass = True
    frame_scores = []
    
    if DEEPFAKE_AVAILABLE and frames:
        try:
            logger.info(f"Running CNN deepfake detection on {len(frames)} frames...")
            
            # Extract face crops from frames
            face_crops = []
            FRAME_SKIP = 5  # Process every 5th frame
            
            for idx in range(0, len(frames), FRAME_SKIP):
                frame = frames[idx]
                
                # Get face crop
                if idx < len(face_boxes) and len(face_boxes[idx]) == 4:
                    x, y, w, h = face_boxes[idx]
                    if w > 0 and h > 0:
                        face_crop = frame[y:y+h, x:x+w]
                        # Convert BGR to RGB if needed
                        if len(face_crop.shape) == 3 and face_crop.shape[2] == 3:
                            import cv2
                            face_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
                        face_crops.append(face_crop)
            
            # Run deepfake model if we have face crops
            if face_crops:
                frame_scores = run_deepfake_model(
                    face_crops, 
                    model_name='xception', 
                    batch_size=16
                )
                
                # Aggregate to video-level score
                video_fake_prob = aggregate_scores(frame_scores, method='mean')
                
                # Apply threshold
                DEEPFAKE_PROB_THRESHOLD = 0.5
                deepfake_pass = (video_fake_prob < DEEPFAKE_PROB_THRESHOLD)
                
                signals['video_fake_prob'] = video_fake_prob
                signals['deepfake_pass'] = deepfake_pass
                signals['deepfake_frames_processed'] = len(face_crops)
                
                logger.info(
                    f"Deepfake detection complete: video_fake_prob={video_fake_prob:.3f}, "
                    f"pass={deepfake_pass}"
                )
            else:
                logger.warning("No face crops extracted for deepfake detection")
                signals['video_fake_prob'] = 0.0
                signals['deepfake_pass'] = False
                signals['deepfake_error'] = 'No faces detected'
        except Exception as e:
            logger.error(f"Deepfake detection error: {e}", exc_info=True)
            signals['video_fake_prob'] = 0.0
            signals['deepfake_pass'] = False
            signals['deepfake_error'] = str(e)
    else:
        # Fallback to legacy CNN if new inference not available
        cnn_model = get_deepfake_cnn()
        if cnn_model and frames:
            scores = []
            # Check up to 5 evenly spaced frames
            indices = np.linspace(0, len(frames)-1, 5, dtype=int)
            
            for idx in indices:
                frame = frames[idx]
                # Crop face using box (simple logic)
                if idx < len(face_boxes):
                    x, y, w, h = face_boxes[idx]
                    if w > 0 and h > 0:
                        face_crop = frame[y:y+h, x:x+w]
                        res = cnn_model.infer_face_crop(face_crop)
                        scores.append(res.get('score', 0.0))
            
            # Max pooling strategy: If any frame is definitely fake, flag it.
            signals['cnn_score'] = float(np.max(scores)) if scores else 0.0
            signals['video_fake_prob'] = signals['cnn_score']
            signals['deepfake_pass'] = signals['cnn_score'] < 0.5
        else:
            signals['cnn_score'] = 0.0
            signals['video_fake_prob'] = 0.0
            signals['deepfake_pass'] = True  # Default safe if no model

    # --- 2. PHYSIOLOGICAL LIVENESS (rPPG) ---
    # Requires continuous frames.
    if frames and len(frames) > 30:
        rppg_res = extract_rppg(frames, face_boxes, fps=30.0)
        signals['rppg_conf'] = rppg_res.get('confidence', 0.0) # Higher confidence = Real Human
        signals['rppg_bpm'] = rppg_res.get('bpm', 0.0)
    else:
        signals['rppg_conf'] = 0.0

    # --- 3. GEOMETRIC CONSISTENCY ---
    if frames:
        # A. Optical Flow (Motion Consistency)
        flow_res = flow_consistency(frames, face_boxes)
        signals['flow_variance'] = flow_res.get('value', 0.0) # High variance = Warping/Fake

        # B. Landmark Jitter
        # Extract landmarks for the sequence
        landmarks_seq = []
        for i, frame in enumerate(frames):
            if i < len(face_boxes):
                lms = detect_landmarks(frame, face_boxes[i])
                landmarks_seq.append(lms)
            else:
                landmarks_seq.append(None)
        
        jitter_res = landmark_jitter(landmarks_seq)
        signals['jitter_score'] = jitter_res.get('value', 0.0) # High jitter = Fake

    # --- 4. AUDIO SECURITY ---
    if audio is not None and len(audio) > 0:
        # A. Anti-Spoofing (TTS/VC Detection)
        spoof_det = get_spoof_detector()
        if spoof_det:
            spoof_res = spoof_det.infer(audio, sr=sr)
            signals['audio_spoof_score'] = spoof_res.get('spoof_score', 0.0)

        # B. Speaker Verification (ASV) - "Is this the enrolled user?"
        asv_model = get_asv_model()
        if asv_model and user_id:
            # Check against enrolled profile
            asv_res = asv_model.asv_score(user_id, audio, sr=sr)
            # We convert similarity (1.0=Same) to Risk (1.0=Different)
            # Risk = 1.0 - Similarity
            sim = asv_res.get('score', 0.0)
            signals['voice_mismatch_score'] = 1.0 - sim
    else:
        # No audio provided - High risk if audio was expected
        signals['audio_missing'] = 1.0

    # --- 5. AUDIO-VISUAL SYNC (Lip Sync) ---
    if frames and audio is not None and len(audio) > 0 and 'landmarks_seq' in locals():
        # Re-use landmarks from step 3B
        sync_res = lip_sync_score(audio, sr, frames, landmarks_seq)
        signals['lip_sync_score'] = sync_res.get('value', 0.0) # High correlation = Real
    else:
        signals['lip_sync_score'] = 0.0

    # --- 6. IDENTITY MATCHING (Visual) ---
    # Does the face match the ID card or enrolled photo?
    embedder = get_face_embedder()
    if embedder and frames and user_id:
        # Take the best looking frame (e.g., middle)
        mid_idx = len(frames) // 2
        if mid_idx < len(face_boxes):
            box = face_boxes[mid_idx]
            x, y, w, h = box
            face_crop = frames[mid_idx][y:y+h, x:x+w]
            
            # Infer embedding
            emb_res = embedder.infer(face_crop)
            if emb_res['success']:
                # In a real app, fetch 'enrolled_embedding' from DB
                # Here we mock a distance check
                # signals['face_mismatch_score'] = cosine_dist(emb_res['embedding'], enrolled)
                signals['face_match_checked'] = 1.0
            else:
                signals['face_match_failed'] = 1.0

    # Debug: Execution time
    processing_ms = (time.time() - start_time) * 1000
    signals['stage2_latency'] = processing_ms
    
    # --- PHASE 2: Compute fusion score ---
    try:
        from models.fusion_scorer import get_fusion_scorer
        
        fusion_scorer = get_fusion_scorer()
        final_score, breakdown = fusion_scorer.score({
            'deepfake_prob': signals.get('video_fake_prob', 0.0),
            'liveness_ok': signals.get('rppg_conf', 0.0) > 0.5,
            'blur_score': stage1_result.get('blur_score', 100.0) if stage1_result else 100.0,
            'rppg_ok': signals.get('rppg_conf', 0.0) > 0.5,
            'opticalflow_ok': signals.get('flow_variance', 0.0) < 0.4
        })
        
        overall_pass = breakdown.get('pass', True)
        
    except Exception as e:
        logger.error(f"Fusion scoring error: {e}", exc_info=True)
        final_score = 0.5
        overall_pass = False
        breakdown = {'error': str(e)}
    
    # --- Build structured response ---
    result = {
        # Primary outputs (Phase 2 specification)
        'video_fake_prob': float(signals.get('video_fake_prob', 0.0)),
        'deepfake_pass': bool(signals.get('deepfake_pass', True)),
        'final_score': float(final_score),
        'overall_pass': bool(overall_pass),
        'audit_id': audit_id,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        
        # Processing metadata
        'processing_ms': processing_ms,
        'frames_processed': len(frames),
        'deepfake_frames_analyzed': signals.get('deepfake_frames_processed', 0),
        
        # All signals for debugging/monitoring
        'signals': signals,
        'fusion_breakdown': breakdown,
        
        # Debug information
        'debug': {
            'stage1_result': stage1_result,
            'deepfake_available': DEEPFAKE_AVAILABLE,
            'frame_scores_sample': frame_scores[:5] if frame_scores else []
        }
    }
    
    logger.info(
        f"Stage2 complete: audit_id={audit_id}, "
        f"video_fake_prob={result['video_fake_prob']:.3f}, "
        f"final_score={final_score:.3f}, overall_pass={overall_pass}, "
        f"processing_ms={processing_ms:.1f}"
    )
    
    return result