import cv2
import numpy as np

def dct_highfreq_energy(face_crop: np.ndarray, patch_coords: tuple = None) -> dict:
    """
    Computes the high-frequency energy of a face crop (or specific patch) using DCT.
    
    Real images tend to have specific high-frequency signatures (camera sensor noise),
    whereas Deepfakes often exhibit abnormal smoothing or checkerboard artifacts in 
    the frequency domain.

    Args:
        face_crop (np.ndarray): The cropped face image (BGR or Gray).
        patch_coords (tuple, optional): (x, y, w, h) to analyze a specific region 
                                        (e.g., eyes or mouth). Defaults to None.

    Returns:
        dict: {
            'value': float,      # The normalized high-frequency energy score
            'confidence': float, # Reliability of the calculation (based on img quality)
            'debug': dict        # Metadata for visualization (e.g., spectral map)
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

        # Process specific patch if requested
        if patch_coords:
            x, y, w, h = patch_coords
            # Ensure coords are within bounds
            h_img, w_img = gray.shape
            x, y = max(0, x), max(0, y)
            w, h = min(w, w_img - x), min(h, h_img - y)
            roi = gray[y:y+h, x:x+w]
        else:
            roi = gray

        # Check if ROI is usable
        if roi.size == 0 or roi.shape[0] < 8 or roi.shape[1] < 8:
            # Too small for meaningful DCT analysis
            result['confidence'] = 0.0
            return result

        # 3. Compute DCT (Discrete Cosine Transform)
        # Convert to float32 (required by cv2.dct) and scale to 0-1 for stability
        img_float = np.float32(roi) / 255.0
        
        # Perform 2D DCT
        dct_coeffs = cv2.dct(img_float)
        
        # 4. Extract High-Frequency Energy
        # In a DCT matrix, the top-left is low frequency. The bottom-right is high frequency.
        # We define "high frequency" as the bottom 50% diagonal or block.
        rows, cols = dct_coeffs.shape
        
        # Create a mask for high frequencies
        # Simple approach: Mask out the top-left quadrant (low freq)
        mask = np.ones_like(dct_coeffs)
        cy, cx = rows // 2, cols // 2
        mask[0:cy, 0:cx] = 0  # Zero out low-mid frequencies
        
        # Apply mask
        high_freq_coeffs = dct_coeffs * mask
        
        # Calculate energy: Sum of squared high-freq coefficients
        # We take the log to make the range manageable, similar to magnitude spectrums
        energy = np.sum(high_freq_coeffs ** 2)
        
        # Normalize by image size to make it invariant to crop size
        normalized_energy = energy / (rows * cols)

        # 5. Populate Result
        # Value: The raw spectral energy metric
        result['value'] = float(normalized_energy)
        
        # Confidence: High if image resolution is sufficient (e.g., > 64x64)
        # Low res images lose high-freq data naturally, making this feature less reliable.
        resolution_score = min(1.0, (rows * cols) / (64 * 64))
        result['confidence'] = float(resolution_score)

        # Debug: Save log spectrum for visualization
        # eps added to avoid log(0)
        abs_dct = np.abs(dct_coeffs)
        log_spectrum = np.log(abs_dct + 1e-5)
        
        # Normalize log spectrum to 0-255 for display
        norm_spectrum = cv2.normalize(log_spectrum, None, 0, 255, cv2.NORM_MINMAX)
        result['debug'] = {
            'spectrum_viz': norm_spectrum.astype(np.uint8),
            'roi_shape': roi.shape
        }

    except Exception as e:
        print(f"Error in dct_hf: {e}")
        result['confidence'] = 0.0
        result['debug']['error'] = str(e)

    return result