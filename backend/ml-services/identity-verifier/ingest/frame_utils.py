"""
frame_utils.py
Purpose: Frame extraction, resizing, alignment utilities.
"""
import cv2
import numpy as np


def extract_frames(video_path, every_n=1, resize=None, max_frames=None):
    """
    Extract frames from a video file.
    Args:
        video_path (str): Path to video file.
        every_n (int): Extract every n-th frame.
        resize (tuple): (width, height) to resize frames, or None.
        max_frames (int): Maximum number of frames to extract, or None.
    Returns:
        frames (list of np.ndarray): List of frames (BGR)
    """
    cap = cv2.VideoCapture(video_path)
    frames = []
    count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if count % every_n == 0:
            if resize is not None:
                frame = cv2.resize(frame, resize)
            frames.append(frame)
            if max_frames is not None and len(frames) >= max_frames:
                break
        count += 1
    cap.release()
    return frames

def align_face_crop(frame, box, output_size=(224, 224), landmarks=None):
    """
    Align and crop face from frame using bounding box and (optionally) landmarks.
    Args:
        frame (np.ndarray): Input frame (BGR)
        box (tuple): (x, y, w, h) bounding box
        output_size (tuple): Output crop size (width, height)
        landmarks (list): Optional facial landmarks for alignment
    Returns:
        crop (np.ndarray): Cropped (and aligned) face image
    """
    x, y, w, h = box
    face = frame[y:y+h, x:x+w]
    # If landmarks provided, do alignment (stub: real impl would use affine transform)
    if landmarks is not None:
        # TODO: Implement alignment using landmarks
        pass
    crop = cv2.resize(face, output_size)
    return crop
