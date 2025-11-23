import cv2
import numpy as np
from typing import List, Dict, Any

def frame_duplication_ratio(frames: List[np.ndarray], threshold: float = 1.0) -> Dict[str, Any]:
    """
    Calculates the ratio of frames that are identical (or nearly identical) to their predecessor.
    
    A high duplication ratio suggests a static image attack (holding a photo) or a 
    frozen video feed, failing the liveness check.

    Args:
        frames (List[np.ndarray]): A list of consecutive video frames (BGR or Gray).
        threshold (float): The mean pixel difference threshold below which frames are 
                           considered "duplicates". Defaults to 1.0 (very strict).

    Returns:
        dict: {
            'value': float,      # Ratio of duplicates (0.0 to 1.0). High = suspicious.
            'confidence': float, # Reliability of the check based on input size.
            'debug': dict        # Metadata including per-frame diffs.
        }
    """
    result = {
        'value': 0.0,
        'confidence': 0.0,
        'debug': {}
    }

    # 1. Validation
    if not frames or len(frames) < 2:
        result['debug']['error'] = "Insufficient frames for duplication check (need >= 2)"
        return result

    try:
        # 2. Preprocessing
        # We perform the check on grayscale resized frames for speed
        gray_frames = []
        for f in frames:
            # Resize to a small fixed size (e.g., 64x64) to ignore minor compression noise
            # and speed up calculation.
            small = cv2.resize(f, (64, 64))
            if len(small.shape) == 3:
                gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
            else:
                gray = small
            gray_frames.append(gray)

        # 3. Calculate Differences
        duplicates_count = 0
        diffs = []
        
        # We iterate from the second frame and compare it to the previous one
        for i in range(1, len(gray_frames)):
            curr = gray_frames[i].astype(np.float32)
            prev = gray_frames[i-1].astype(np.float32)
            
            # Calculate Mean Absolute Difference (L1 norm)
            diff = np.abs(curr - prev)
            mean_diff = np.mean(diff)
            diffs.append(float(mean_diff))
            
            # If the difference is negligible, it's a duplicate
            # Real cameras always have sensor noise (diff > 0), even on a tripod.
            # A diff of ~0.0 implies a digital freeze or exact copy.
            if mean_diff < threshold:
                duplicates_count += 1

        # 4. Calculate Ratio
        total_transitions = len(frames) - 1
        ratio = duplicates_count / total_transitions

        # 5. Populate Result
        result['value'] = float(ratio)
        
        # Confidence logic:
        # If we have very few frames (e.g., < 10), the ratio is statistically weak.
        # If we have > 30 frames (e.g., 1 sec at 30fps), confidence is high.
        frame_count_reliability = min(1.0, total_transitions / 30.0)
        result['confidence'] = float(frame_count_reliability)
        
        result['debug'] = {
            'total_transitions': total_transitions,
            'duplicates_found': duplicates_count,
            'avg_diff': float(np.mean(diffs)) if diffs else 0.0,
            'min_diff': float(np.min(diffs)) if diffs else 0.0
        }

    except Exception as e:
        result['debug']['error'] = str(e)
        print(f"Duplication Check Error: {e}")

    return result