
import numpy as np
import cv2

def boundary_blend_score(face_crop, frame, boundary_width=5):
    """
    Compute boundary blend score between the face crop and its surrounding region in the frame.
    Args:
        face_crop (np.ndarray): Cropped face image (H, W, C) or (H, W).
        frame (np.ndarray): Original frame image (H_full, W_full, C) or (H_full, W_full).
        boundary_width (int): Width of the boundary region to compare (in pixels).
    Returns:
        float: Blend score (higher means more difference at the boundary, i.e., less natural blending).
    """
    # If face_crop is not grayscale, convert to grayscale
    if face_crop.ndim == 3:
        face_gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    else:
        face_gray = face_crop.copy()

    h, w = face_gray.shape

    # Create mask for inner face and boundary
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.rectangle(mask, (boundary_width, boundary_width), (w-boundary_width-1, h-boundary_width-1), 255, -1)
    inner_face = cv2.bitwise_and(face_gray, face_gray, mask=mask)

    # Boundary mask: subtract inner face mask from full mask
    boundary_mask = cv2.bitwise_xor(mask, 255)
    boundary_pixels = face_gray[boundary_mask == 255]

    # Compute texture (e.g., standard deviation) in boundary and inner face
    inner_pixels = face_gray[mask == 255]
    if len(boundary_pixels) == 0 or len(inner_pixels) == 0:
        return 0.0

    boundary_std = np.std(boundary_pixels)
    inner_std = np.std(inner_pixels)

    # Score: difference in texture between boundary and inner face
    score = float(abs(boundary_std - inner_std))
    return score
