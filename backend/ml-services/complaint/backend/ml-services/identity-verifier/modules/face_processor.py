import cv2
import numpy as np
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# --- Load OpenCV's pre-trained Haar Cascade models ---
# These XML files are included with the opencv-python package.
try:
    CASCADE_PATH = cv2.data.haarcascades
    FACE_CASCADE = cv2.CascadeClassifier(os.path.join(CASCADE_PATH, 'haarcascade_frontalface_default.xml'))
    EYE_CASCADE = cv2.CascadeClassifier(os.path.join(CASCADE_PATH, 'haarcascade_eye.xml'))
    
    if FACE_CASCADE.empty():
        log.error("Failed to load face cascade classifier. Make sure the file is correct.")
    if EYE_CASCADE.empty():
        log.error("Failed to load eye cascade classifier. Make sure the file is correct.")
        
except Exception as e:
    log.error(f"Error loading Haar cascades: {e}. Make sure opencv-python is installed correctly.")
    # Define dummy classifiers if loading fails to avoid crashing app.py
    FACE_CASCADE = None
    EYE_CASCADE = None

# --- Constants for Analysis ---
# We'll process 1 frame every 5 to speed things up
FRAME_SKIP = 5 

# Liveness: We expect at least 1 blink in a short video.
MIN_BLINKS_FOR_LIVENESS = 1

# Deepfake: Heuristic-based. Real videos have high-frequency detail (sharp).
# Blurry/smooth videos (like many deepfakes) will have a low variance.
# This is a PROTOTYPE check. A real system uses a CNN.
BLUR_THRESHOLD = 80.0  # If average blur is below this, flag as potential fake.


def analyze_face(video_path):
    """
    Analyzes a video file to perform face detection, liveness checks (blink detection),
    and a heuristic-based deepfake (blur) check.
    
    Args:
        video_path (str): The file path to the uploaded video.

    Returns:
        dict: A dictionary containing the analysis results.
    """
    log.info(f"Starting face analysis for: {video_path}")
    
    if not (FACE_CASCADE and EYE_CASCADE):
        log.error("Cascades not loaded. Cannot perform analysis.")
        return {'status': 'error', 'message': 'Server configuration error: Could not load CV models.'}

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        log.error("Error: Could not open video file.")
        return {'status': 'error', 'message': 'Could not open video file.'}

    # --- Analysis Variables ---
    frame_count = 0
    frames_with_face = 0
    blink_count = 0
    was_blinking = False
    blur_scores = []

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break  # End of video

            # --- Frame Skipping for Performance ---
            frame_count += 1
            if frame_count % FRAME_SKIP != 0:
                continue

            # --- 1. Face Detection ---
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            # detectMultiScale finds faces of different sizes
            faces = FACE_CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

            if len(faces) > 0:
                frames_with_face += 1
                # Assume the largest detected face is the user
                (x, y, w, h) = faces[0]
                
                # Create a "Region of Interest" (ROI) for the face
                face_roi_gray = gray[y:y+h, x:x+w]

                # --- 2. Liveness Check (Blink Detection) ---
                # We detect eyes *within* the face ROI.
                # If a face is found but eyes are NOT, we count it as a blink.
                eyes = EYE_CASCADE.detectMultiScale(face_roi_gray, scaleFactor=1.1, minNeighbors=4)
                
                if len(eyes) == 0:
                    # No eyes detected, this could be a blink
                    was_blinking = True
                else:
                    # Eyes are present
                    if was_blinking:
                        # We just finished a blink
                        blink_count += 1
                        was_blinking = False  # Reset for next blink
                
                # --- 3. Deepfake Check (Blur Heuristic) ---
                # We calculate the variance of the Laplacian (a measure of image sharpness).
                # Low variance = blurry. High variance = sharp.
                lap_variance = cv2.Laplacian(face_roi_gray, cv2.CV_64F).var()
                blur_scores.append(lap_variance)

    except Exception as e:
        log.error(f"Error during video processing: {e}", exc_info=True)
        return {'status': 'error', 'message': f'Internal processing error: {e}'}
    finally:
        cap.release()
        log.info(f"Video processing finished. Total frames: {frame_count}, Frames with face: {frames_with_face}")

    # --- 4. Final Verdict ---
    if frames_with_face == 0:
        log.warning("Analysis failed: No face was detected in the video.")
        return {
            'status': 'failed',
            'message': 'No face detected in the video. Please try again.',
            'overall_pass': False
        }

    # Calculate average blur score
    avg_blur_score = np.mean(blur_scores) if blur_scores else 0

    # Determine pass/fail for each check
    liveness_passed = blink_count >= MIN_BLINKS_FOR_LIVENESS
    deepfake_check_passed = avg_blur_score > BLUR_THRESHOLD

    overall_pass = liveness_passed and deepfake_check_passed
    
    # --- Build Response Dictionary ---
    result = {
        'status': 'success',
        'message': 'Face analysis complete.',
        'overall_pass': overall_pass,
        'face_detected_ratio': frames_with_face / (frame_count / FRAME_SKIP),
        'liveness_check': {
            'passed': liveness_passed,
            'blinks_detected': blink_count,
            'required_blinks': MIN_BLINKS_FOR_LIVENESS,
            'message': 'Liveness check passed.' if liveness_passed else 'Liveness check failed (Blink not detected).'
        },
        'deepfake_check (heuristic)': {
            'passed': deepfake_check_passed,
            'sharpness_score': round(avg_blur_score, 2),
            'sharpness_threshold': BLUR_THRESHOLD,
            'message': 'Authenticity check passed (video is sharp).' if deepfake_check_passed else 'Authenticity check failed (Video is blurry, potential spoof).'
        }
    }
    
    log.info(f"Analysis result: {result}")
    return result

# --- Main block for testing ---
if __name__ == "__main__":
    # You can test this script by placing a video file named 'test_video.mp4'
    # in the 'identity-verifier' directory and running 'python modules/face_processor.py'
    
    # This path is relative to the root of the 'identity-verifier' service
    test_video_path = '../test_video.mp4' 
    
    if not os.path.exists(test_video_path):
        print(f"Test video not found at {test_video_path}")
        print("Please add a video file to test.")
    else:
        print(f"Running test analysis on {test_video_path}...")
        results = analyze_face(test_video_path)
        import json
        print(json.dumps(results, indent=2))