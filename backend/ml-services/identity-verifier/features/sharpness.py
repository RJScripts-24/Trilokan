import cv2
import numpy as np
from typing import Dict, Any

def laplacian_variance(face_crop: np.ndarray) -> Dict[str, Any]:
    """
    Computes the focus measure of an image using the Variance of Laplacian.
    
    Deepfakes often suffer from 'smoothing' artifacts where skin texture 
    loses high-frequency detail. A very low score indicates a blurry face, 
    which might be a sign of a masked identity or poor generation quality.

    Args:
        face_crop (np.ndarray): The cropped face image (BGR or Gray).

    Returns:
        dict: {
            'value': float,      # The variance score. Higher = Sharper.
            'confidence': float, # Reliability based on resolution.
            'debug': dict
        }
    """
    result = {
        'value': 0.0,
        'confidence': 0.0,
        'debug': {}
    }

    # 1. Validation
    if face_crop is None or face_crop.size == 0:
        return result

    try:
        # 2. Preprocessing
        # Convert to grayscale if necessary
        if len(face_crop.shape) == 3:
            gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        else:
            gray = face_crop

        # 3. Compute Laplacian
        # cv2.Laplacian calculates the gradient magnitude (edges)
        # ddepth=cv2.CV_64F is needed to avoid overflow for negative gradients
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)

        # 4. Calculate Variance
        # The variance of the Laplacian response is our sharpness score.
        variance = laplacian.var()

        # 5. Populate Result
        result['value'] = float(variance)

        # Confidence Logic:
        # Blur detection is unreliable on very low-res thumbnails (e.g., < 32x32).
        # We penalize confidence if the face crop is tiny.
        h, w = gray.shape
        pixel_count = h * w
        
        # Assume 64x64 (4096 pixels) is a decent baseline for "reliable" texture analysis
        res_reliability = min(1.0, pixel_count / 4096.0)
        result['confidence'] = float(res_reliability)

        result['debug'] = {
            'resolution': f"{w}x{h}",
            'mean_intensity': float(np.mean(gray))
        }

    except Exception as e:
        result['debug']['error'] = str(e)
        print(f"Sharpness Error: {e}")

    return result