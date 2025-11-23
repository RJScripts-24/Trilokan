"""
Deepfake inference utilities.
High-level API for running CNN-based deepfake detection and score aggregation.
"""

import logging
from typing import List, Optional
import numpy as np

logger = logging.getLogger(__name__)


def run_deepfake_model(
    frames: List[np.ndarray],
    model_name: str = 'xception',
    batch_size: int = 32
) -> List[float]:
    """
    Run deepfake detection model on face-cropped frames.
    
    Args:
        frames: List of HxWx3 uint8 RGB face-crop images (unaligned allowed)
        model_name: Model to use ('xception' or 'efficientnet')
        batch_size: Batch size for GPU inference
        
    Returns:
        List of probabilities (0.0=real, 1.0=fake), same length as input
        
    Example:
        >>> frames = [cv2.imread('face1.jpg'), cv2.imread('face2.jpg')]
        >>> probs = run_deepfake_model(frames, model_name='xception', batch_size=16)
        >>> print(f"Frame 1 fake probability: {probs[0]:.3f}")
    """
    if not frames:
        logger.warning("Empty frames list provided to run_deepfake_model")
        return []
    
    # Import here to avoid circular dependencies
    from models.cnn_deepfake import get_detector
    
    try:
        # Get model detector
        detector = get_detector(name=model_name)
        
        # Run inference
        probabilities = detector.predict(frames, batch_size=batch_size)
        
        # Validate output
        if len(probabilities) != len(frames):
            logger.error(
                f"Model returned {len(probabilities)} predictions "
                f"for {len(frames)} frames"
            )
            raise ValueError("Prediction count mismatch")
        
        # Ensure all values are in [0, 1]
        probabilities = [max(0.0, min(1.0, p)) for p in probabilities]
        
        logger.debug(
            f"Processed {len(frames)} frames with {model_name}, "
            f"mean fake prob: {np.mean(probabilities):.3f}"
        )
        
        return probabilities
        
    except Exception as e:
        logger.error(f"Error in run_deepfake_model: {e}")
        raise


def aggregate_scores(
    frame_scores: List[float],
    method: str = 'mean'
) -> float:
    """
    Aggregate per-frame deepfake scores to video-level score.
    
    Args:
        frame_scores: List of per-frame probabilities (0.0=real, 1.0=fake)
        method: Aggregation method ('mean', 'max', or 'percentile')
                - 'mean': Average of all frame scores
                - 'max': Maximum frame score (most suspicious frame)
                - 'percentile': 90th percentile (robust to outliers)
                
    Returns:
        Single aggregated probability (0.0=real, 1.0=fake)
        
    Example:
        >>> scores = [0.1, 0.2, 0.15, 0.8, 0.12]
        >>> aggregate_scores(scores, method='mean')  # 0.254
        >>> aggregate_scores(scores, method='max')   # 0.8
        >>> aggregate_scores(scores, method='percentile')  # ~0.635
    """
    if not frame_scores:
        logger.warning("Empty frame_scores provided to aggregate_scores")
        return 0.0
    
    scores_array = np.array(frame_scores)
    
    if method == 'mean':
        result = float(np.mean(scores_array))
        
    elif method == 'max':
        result = float(np.max(scores_array))
        
    elif method == 'percentile':
        # Use 90th percentile as robust alternative to max
        result = float(np.percentile(scores_array, 90))
        
    else:
        logger.warning(f"Unknown aggregation method '{method}', using 'mean'")
        result = float(np.mean(scores_array))
    
    # Ensure result is in [0, 1]
    result = max(0.0, min(1.0, result))
    
    logger.debug(
        f"Aggregated {len(frame_scores)} scores using '{method}': {result:.3f}"
    )
    
    return result


def batch_inference(
    video_frames: List[np.ndarray],
    face_detector_fn,
    model_name: str = 'xception',
    frame_skip: int = 5,
    batch_size: int = 16,
    aggregation_method: str = 'mean'
) -> dict:
    """
    End-to-end deepfake detection on video frames.
    
    Args:
        video_frames: List of full video frames (not face crops)
        face_detector_fn: Callable that takes frame and returns face crop or None
        model_name: Deepfake model to use
        frame_skip: Process every Nth frame (for efficiency)
        batch_size: Batch size for model inference
        aggregation_method: How to aggregate frame scores
        
    Returns:
        Dictionary with:
            - 'video_fake_prob': aggregated video-level probability
            - 'frame_scores': list of per-frame probabilities
            - 'frames_processed': number of frames with detected faces
            - 'frames_skipped': number of frames without faces
            
    Example:
        >>> import cv2
        >>> from some_face_detector import detect_face
        >>> cap = cv2.VideoCapture('video.mp4')
        >>> frames = [cap.read()[1] for _ in range(100)]
        >>> result = batch_inference(frames, detect_face, frame_skip=5)
        >>> print(f"Video fake probability: {result['video_fake_prob']:.3f}")
    """
    face_crops = []
    frames_skipped = 0
    
    # Extract face crops
    for idx, frame in enumerate(video_frames):
        if idx % frame_skip != 0:
            continue
        
        face = face_detector_fn(frame)
        if face is None:
            frames_skipped += 1
            continue
        
        face_crops.append(face)
    
    if not face_crops:
        logger.warning("No faces detected in video")
        return {
            'video_fake_prob': 0.0,
            'frame_scores': [],
            'frames_processed': 0,
            'frames_skipped': frames_skipped
        }
    
    # Run deepfake detection
    frame_scores = run_deepfake_model(
        face_crops,
        model_name=model_name,
        batch_size=batch_size
    )
    
    # Aggregate scores
    video_fake_prob = aggregate_scores(frame_scores, method=aggregation_method)
    
    return {
        'video_fake_prob': video_fake_prob,
        'frame_scores': frame_scores,
        'frames_processed': len(face_crops),
        'frames_skipped': frames_skipped
    }
