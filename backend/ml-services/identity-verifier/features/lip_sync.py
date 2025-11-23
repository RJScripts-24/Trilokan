import numpy as np
from scipy.spatial import distance
from scipy.stats import pearsonr
from typing import List, Dict, Any, Union

def calculate_mar(mouth_points: np.ndarray) -> float:
    """
    Calculates the Mouth Aspect Ratio (MAR).
    MAR = (Vertical Distance) / (Horizontal Distance)
    
    Args:
        mouth_points (np.ndarray): 12 or 20 points representing the mouth.
                                   (dlib indices 48-68).
    Returns:
        float: The openness ratio.
    """
    # Using dlib 68-point landmarks:
    # Outer lips: 48-59
    # Inner lips: 60-67
    
    # We generally use the outer lip points for stability
    # Vertical points: (50, 58), (51, 57), (52, 56)
    # Horizontal points: (48, 54)
    
    # Ensure we have enough points (handling partial landmark inputs)
    if len(mouth_points) == 68:
        # Extract outer mouth
        pts = mouth_points[48:60]
    elif len(mouth_points) == 20:
        pts = mouth_points
    else:
        # Fallback if strictly inner mouth or specific subset passed
        return 0.0

    # Vertical distances (A, B, C)
    A = distance.euclidean(pts[2], pts[10]) # 50-58
    B = distance.euclidean(pts[3], pts[9])  # 51-57
    C = distance.euclidean(pts[4], pts[8])  # 52-56

    # Horizontal distance (D)
    D = distance.euclidean(pts[0], pts[6])  # 48-54

    if D == 0:
        return 0.0

    # Average vertical / horizontal
    mar = (A + B + C) / (3.0 * D)
    return mar

def lip_sync_score(
    audio_buffer: np.ndarray, 
    sample_rate: int,
    frames: List[np.ndarray], 
    landmarks_list: List[np.ndarray],
    fps: float = 30.0
) -> Dict[str, Any]:
    """
    Computes a synchronization score between audio energy and mouth movements.
    
    Args:
        audio_buffer (np.ndarray): Raw audio samples (1D float array).
        sample_rate (int): Audio sample rate (e.g., 44100).
        frames (List): Video frames (used for count/verification).
        landmarks_list (List): List of (68, 2) landmark arrays per frame.
        fps (float): Video frames per second.

    Returns:
        dict: {
            'value': float,      # Sync score (-1.0 to 1.0). High positive = Good Sync.
            'confidence': float, # Reliability based on variance/length.
            'debug': dict
        }
    """
    result = {
        'value': 0.0,
        'confidence': 0.0,
        'debug': {}
    }

    # 1. Validation
    if not landmarks_list or not audio_buffer.any():
        result['debug']['error'] = "Missing landmarks or audio"
        return result

    if len(landmarks_list) < 10:
        result['debug']['error'] = "Insufficient frames (need >= 10)"
        return result

    try:
        # 2. Extract Visual Signal (Mouth Openness)
        mar_series = []
        for lms in landmarks_list:
            if lms is not None:
                # Dlib landmarks 48-68 are the mouth
                mouth_pts = lms
                mar = calculate_mar(mouth_pts)
                mar_series.append(mar)
            else:
                mar_series.append(0.0)

        mar_signal = np.array(mar_series)

        # 3. Extract Audio Signal (Frame-aligned Energy)
        # We need to map audio samples to video frames
        audio_signal = []
        samples_per_frame = int(sample_rate / fps)
        
        # Determine strict length (min of video frames or available audio duration)
        total_frames = len(frames)
        max_audio_frames = len(audio_buffer) // samples_per_frame
        n_points = min(total_frames, max_audio_frames, len(mar_signal))

        for i in range(n_points):
            start_idx = i * samples_per_frame
            end_idx = start_idx + samples_per_frame
            chunk = audio_buffer[start_idx:end_idx]
            
            # Calculate RMS amplitude (Energy) for this frame
            # Add small epsilon to avoid log(0) if needed, though we use raw energy here
            rmse = np.sqrt(np.mean(chunk**2))
            audio_signal.append(rmse)

        audio_signal = np.array(audio_signal)
        mar_signal = mar_signal[:n_points]

        # 4. Compute Correlation
        # We perform a sliding window smoothing to reduce jitter noise
        window_size = 3
        if len(mar_signal) > window_size:
            mar_smooth = np.convolve(mar_signal, np.ones(window_size)/window_size, mode='same')
            audio_smooth = np.convolve(audio_signal, np.ones(window_size)/window_size, mode='same')
        else:
            mar_smooth = mar_signal
            audio_smooth = audio_signal

        # Pearson Correlation Coefficient
        # Returns (correlation, p-value)
        # A talking face usually implies: Audio UP -> Mouth Open (MAR UP) => Positive correlation
        corr, _ = pearsonr(mar_smooth, audio_smooth)

        # Handle NaN cases (e.g., constant silence or static image)
        if np.isnan(corr):
            corr = 0.0

        # 5. Populate Result
        result['value'] = float(corr)
        
        # Confidence
        # Depends on signal variance (if mouth never moves or audio is silent, confidence is low)
        mar_std = np.std(mar_smooth)
        audio_std = np.std(audio_smooth)
        
        # If std is too low, we can't judge sync
        signal_quality = 1.0
        if mar_std < 0.01 or audio_std < 0.001:
            signal_quality = 0.2 
        
        result['confidence'] = float(signal_quality * min(1.0, n_points / 30.0))
        
        result['debug'] = {
            'mar_std': float(mar_std),
            'audio_std': float(audio_std),
            'frames_aligned': n_points
        }

    except Exception as e:
        result['debug']['error'] = str(e)
        print(f"LipSync Error: {e}")

    return result