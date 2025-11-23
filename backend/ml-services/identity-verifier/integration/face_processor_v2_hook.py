"""
Face processor integration hook for deepfake detection.
Shows how to integrate CNN deepfake detector into existing face processing pipeline.

PROCESSING CONSENT NOTICE:
Face frames are processed in-memory for deepfake detection. No permanent storage
is created unless explicitly requested for debugging purposes. All temporary data
is stored in temp_uploads/ and deleted after processing. See docs/PRIVACY.md.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)

# Configuration constants
FRAME_SKIP = 5  # Process every 5th frame for efficiency
BATCH_SIZE = 16  # GPU batch size for inference
DEEPFAKE_PROB_THRESHOLD = 0.5  # Tunable threshold (calibrate on validation data)
BLUR_THRESHOLD = 100.0  # Minimum blur score for acceptance
MIN_FRAMES_FOR_DETECTION = 3  # Minimum frames needed for reliable detection


def integrate_deepfake_detection(
    video_frames: List[np.ndarray],
    face_detector_fn,
    liveness_passed: bool = True,
    blur_score: float = 100.0,
    model_name: str = 'xception',
    aggregation_method: str = 'mean',
    frame_skip: int = FRAME_SKIP,
    batch_size: int = BATCH_SIZE,
    threshold: float = DEEPFAKE_PROB_THRESHOLD
) -> Dict[str, Any]:
    """
    Integrate deepfake detection into face processing pipeline.
    
    This function demonstrates the complete integration pattern for adding
    CNN deepfake detection to an existing video verification workflow.
    
    Args:
        video_frames: List of full video frames (BGR format from cv2)
        face_detector_fn: Function that takes frame, returns face crop or None
        liveness_passed: Whether liveness checks passed
        blur_score: Blur/sharpness score from existing pipeline
        model_name: Deepfake model to use ('xception' or 'efficientnet')
        aggregation_method: How to aggregate scores ('mean', 'max', 'percentile')
        frame_skip: Process every Nth frame
        batch_size: Batch size for inference
        threshold: Deepfake probability threshold
        
    Returns:
        Dictionary containing:
            - overall_pass: bool - Final verification result
            - deepfake_pass: bool - Deepfake check result
            - video_fake_prob: float - Aggregated fake probability
            - frame_scores: list - Per-frame probabilities
            - frames_processed: int - Number of frames analyzed
            - liveness_passed: bool - Input liveness result
            - blur_passed: bool - Blur check result
            
    Example:
        >>> from modules.face_processor import detect_and_align_face
        >>> import cv2
        >>> cap = cv2.VideoCapture('video.mp4')
        >>> frames = []
        >>> while True:
        ...     ret, frame = cap.read()
        ...     if not ret: break
        ...     frames.append(frame)
        >>> result = integrate_deepfake_detection(
        ...     frames,
        ...     detect_and_align_face,
        ...     liveness_passed=True,
        ...     blur_score=150.0
        ... )
        >>> print(f"Overall pass: {result['overall_pass']}")
    """
    from inference.deepfake_inference import run_deepfake_model, aggregate_scores
    
    # Buffer for face crops
    frame_buffer = []
    deepfake_scores = []
    frames_without_faces = 0
    
    logger.info(
        f"Starting deepfake detection on {len(video_frames)} frames "
        f"(processing every {frame_skip} frame(s))"
    )
    
    # Extract and batch process face crops
    for idx, frame in enumerate(video_frames):
        # Skip frames for efficiency
        if idx % frame_skip != 0:
            continue
        
        # Detect and align face
        face = face_detector_fn(frame)
        
        if face is None:
            frames_without_faces += 1
            continue
        
        frame_buffer.append(face)
        
        # Process batch when full
        if len(frame_buffer) >= batch_size:
            probs = run_deepfake_model(
                frame_buffer,
                model_name=model_name,
                batch_size=batch_size
            )
            deepfake_scores.extend(probs)
            frame_buffer = []
    
    # Process remaining frames in buffer
    if frame_buffer:
        probs = run_deepfake_model(
            frame_buffer,
            model_name=model_name,
            batch_size=batch_size
        )
        deepfake_scores.extend(probs)
    
    # Check if we have enough frames
    if len(deepfake_scores) < MIN_FRAMES_FOR_DETECTION:
        logger.warning(
            f"Only {len(deepfake_scores)} frames processed, "
            f"minimum {MIN_FRAMES_FOR_DETECTION} required for reliable detection"
        )
        # Fail-safe: if we can't detect enough faces, flag as suspicious
        return {
            'overall_pass': False,
            'deepfake_pass': False,
            'video_fake_prob': 1.0,
            'frame_scores': deepfake_scores,
            'frames_processed': len(deepfake_scores),
            'frames_skipped': frames_without_faces,
            'liveness_passed': liveness_passed,
            'blur_passed': blur_score > BLUR_THRESHOLD,
            'error': 'Insufficient faces detected'
        }
    
    # Aggregate frame scores to video-level score
    video_fake_prob = aggregate_scores(deepfake_scores, method=aggregation_method)
    
    # Apply threshold
    deepfake_pass = (video_fake_prob < threshold)
    
    # Compute overall pass (combines all checks)
    blur_passed = blur_score > BLUR_THRESHOLD
    overall_pass = liveness_passed and deepfake_pass and blur_passed
    
    logger.info(
        f"Deepfake detection complete: "
        f"video_fake_prob={video_fake_prob:.3f}, "
        f"deepfake_pass={deepfake_pass}, "
        f"overall_pass={overall_pass}"
    )
    
    return {
        'overall_pass': overall_pass,
        'deepfake_pass': deepfake_pass,
        'video_fake_prob': video_fake_prob,
        'frame_scores': deepfake_scores,
        'frames_processed': len(deepfake_scores),
        'frames_skipped': frames_without_faces,
        'liveness_passed': liveness_passed,
        'blur_passed': blur_passed,
        'blur_score': blur_score
    }


def example_integration_snippet():
    """
    Example code snippet showing minimal integration into face_processor.py.
    
    This demonstrates the core integration pattern that can be dropped into
    an existing video processing pipeline.
    """
    from inference.deepfake_inference import run_deepfake_model, aggregate_scores
    
    # Configuration
    FRAME_SKIP = 5
    BATCH_SIZE = 16
    DEEPFAKE_PROB_THRESHOLD = 0.5
    
    # Assume these are available in your pipeline:
    # - video_frames: list of frames
    # - detect_and_align_face: function that returns face crop
    # - liveness_passed: bool
    # - blur_score: float
    
    video_frames = []  # Your video frames
    detect_and_align_face = None  # Your face detector
    liveness_passed = True  # Your liveness result
    blur_score = 100.0  # Your blur score
    BLUR_THRESHOLD = 100.0
    
    # Deepfake detection
    frame_buffer = []
    deepfake_scores = []
    
    for idx, frame in enumerate(video_frames):
        if idx % FRAME_SKIP != 0:
            continue
        
        face = detect_and_align_face(frame)  # existing helper
        if face is None:
            continue
        
        frame_buffer.append(face)
        
        if len(frame_buffer) >= BATCH_SIZE:
            probs = run_deepfake_model(
                frame_buffer,
                model_name='xception',
                batch_size=BATCH_SIZE
            )
            deepfake_scores.extend(probs)
            frame_buffer = []
    
    # Process remaining
    if frame_buffer:
        deepfake_scores.extend(
            run_deepfake_model(frame_buffer, model_name='xception', batch_size=BATCH_SIZE)
        )
    
    # Aggregate and decide
    video_fake_prob = aggregate_scores(deepfake_scores, method='mean')
    deepfake_pass = (video_fake_prob < DEEPFAKE_PROB_THRESHOLD)
    overall_pass = liveness_passed and deepfake_pass and (blur_score > BLUR_THRESHOLD)
    
    return {
        'overall_pass': overall_pass,
        'video_fake_prob': video_fake_prob,
        'deepfake_pass': deepfake_pass
    }
