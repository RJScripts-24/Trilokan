import cv2
import numpy as np
from typing import List, Dict, Any, Tuple

def flow_consistency(
    frames: List[np.ndarray], 
    face_boxes: List[Tuple[int, int, int, int]]
) -> Dict[str, Any]:
    """
    Computes the consistency of Optical Flow within the face region across frames.
    
    Real faces move relatively rigidly (the skull doesn't warp).
    Deepfakes often exhibit inconsistent "warping" flow or high variance 
    within the face mask as the AI tries to align features frame-by-frame.

    Args:
        frames (List[np.ndarray]): List of consecutive video frames (BGR or Gray).
        face_boxes (List[Tuple]): List of (x, y, w, h) for each frame.

    Returns:
        dict: {
            'value': float,      # Consistency Score (Variance). High = Suspicious/Warping.
            'confidence': float, # Reliability based on motion magnitude.
            'debug': dict
        }
    """
    result = {
        'value': 0.0,
        'confidence': 0.0,
        'debug': {}
    }

    # 1. Validation
    if not frames or len(frames) < 2:
        result['debug']['error'] = "Insufficient frames (need >= 2)"
        return result

    if len(frames) != len(face_boxes):
        # Trim to match shortest length
        min_len = min(len(frames), len(face_boxes))
        frames = frames[:min_len]
        face_boxes = face_boxes[:min_len]

    try:
        flow_variances = []
        motion_magnitudes = []
        
        # We define a standard size for flow calculation to ensure speed
        # and consistency across different video resolutions.
        Process_Size = (128, 128)

        # Pre-process first frame
        prev_gray = cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY)
        
        # 2. Iterate through frame pairs
        for i in range(1, len(frames)):
            curr_gray = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY)
            box = face_boxes[i]
            
            # Skip if box is invalid
            if not box or box[2] <= 0 or box[3] <= 0:
                prev_gray = curr_gray
                continue

            # Resize whole frames for flow calculation (expensive otherwise)
            # Alternatively, we can just crop the face + margin first.
            # Let's crop face + 20% margin to see relative motion
            x, y, w, h = box
            margin = int(w * 0.2)
            h_img, w_img = curr_gray.shape
            
            x1 = max(0, x - margin)
            y1 = max(0, y - margin)
            x2 = min(w_img, x + w + margin)
            y2 = min(h_img, y + h + margin)
            
            curr_crop = curr_gray[y1:y2, x1:x2]
            prev_crop = prev_gray[y1:y2, x1:x2]

            if curr_crop.size == 0 or prev_crop.size == 0 or curr_crop.shape != prev_crop.shape:
                prev_gray = curr_gray
                continue

            # Resize for consistent flow analysis
            curr_small = cv2.resize(curr_crop, Process_Size)
            prev_small = cv2.resize(prev_crop, Process_Size)

            # 3. Calculate Dense Optical Flow (Farneback)
            # flow has shape (h, w, 2) -> (dx, dy)
            flow = cv2.calcOpticalFlowFarneback(
                prev_small, curr_small, None, 
                pyr_scale=0.5, levels=3, winsize=15, 
                iterations=3, poly_n=5, poly_sigma=1.2, flags=0
            )

            # 4. Analyze Flow Statistics
            # Calculate magnitude and angle
            mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            
            # Filter out background (assume face is in the center of our crop)
            # We take the central 50% of the crop as the "Face Core"
            ch, cw = mag.shape
            cx, cy = cw // 2, ch // 2
            roi_w, roi_h = cw // 2, ch // 2
            face_mag = mag[cy - roi_h//2 : cy + roi_h//2, cx - roi_w//2 : cx + roi_w//2]

            # Metric: Variance of Motion Magnitude
            # If the face is moving rigidly, all pixels should have roughly similar motion vectors.
            # If it's warping (AI artifact), variance will be higher relative to the mean motion.
            
            mean_motion = np.mean(face_mag)
            std_motion = np.std(face_mag)
            
            motion_magnitudes.append(mean_motion)
            
            # Normalize variance by the amount of movement
            # If head is still, variance is noise. If head moves, variance matters.
            if mean_motion > 0.5: # Threshold for "significant motion"
                normalized_variance = std_motion / mean_motion
                flow_variances.append(normalized_variance)
            
            # Prepare for next iteration
            prev_gray = curr_gray

        # 5. Aggregate Results
        if not flow_variances:
            # No significant motion detected -> cannot judge consistency
            result['value'] = 0.0
            result['confidence'] = 0.0
            result['debug']['msg'] = "Subject too still for flow analysis"
            return result

        avg_variance = np.mean(flow_variances)
        avg_motion = np.mean(motion_magnitudes)

        # 6. Normalize Score
        # Real faces usually have normalized variance < 0.3 during motion.
        # Deepfakes often > 0.5 due to "swimming" pixels.
        result['value'] = float(avg_variance)
        
        # Confidence depends on how much the person moved.
        # More movement = easier to spot warping artifacts.
        motion_score = min(1.0, avg_motion / 5.0) 
        result['confidence'] = float(motion_score)

        result['debug'] = {
            'avg_motion_magnitude': float(avg_motion),
            'flow_variance_raw': float(avg_variance),
            'frames_analyzed': len(flow_variances)
        }

    except Exception as e:
        result['debug']['error'] = str(e)
        print(f"Optical Flow Error: {e}")

    return result