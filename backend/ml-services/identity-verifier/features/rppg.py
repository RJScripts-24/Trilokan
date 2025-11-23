import cv2
import numpy as np
from scipy import signal, fftpack
from typing import List, Dict, Any, Tuple

def extract_rppg(
    frames: List[np.ndarray], 
    face_boxes: List[Tuple[int, int, int, int]], 
    fps: float = 30.0
) -> Dict[str, Any]:
    """
    Extracts the heart rate signal (rPPG) from a video sequence.
    
    Deepfakes/Masks typically lack the subtle periodic color changes 
    caused by blood volume pulse.

    Args:
        frames (List[np.ndarray]): List of video frames (BGR).
        face_boxes (List[Tuple]): Bounding boxes (x, y, w, h) for each frame.
        fps (float): Frames per second of the video.

    Returns:
        dict: {
            'bpm': float,        # Estimated Beats Per Minute
            'confidence': float, # SNR (Signal-to-Noise Ratio) of the peak frequency
            'signal': list,      # Processed time-series signal (for visualization)
            'debug': dict
        }
    """
    result = {
        'bpm': 0.0,
        'confidence': 0.0,
        'signal': [],
        'debug': {}
    }

    # 1. Validation
    # We need at least ~64 frames (~2 seconds) to detect a pulse reliably
    min_frames = 30
    if not frames or len(frames) < min_frames:
        result['debug']['error'] = f"Insufficient frames for rPPG (need > {min_frames})"
        return result

    if len(frames) != len(face_boxes):
        min_len = min(len(frames), len(face_boxes))
        frames = frames[:min_len]
        face_boxes = face_boxes[:min_len]

    try:
        raw_signal = []

        # 2. ROI Extraction & Averaging
        # We focus on the central part of the face (cheeks/nose) or forehead
        # to avoid hair/background noise.
        for i, frame in enumerate(frames):
            x, y, w, h = face_boxes[i]
            
            # Skip invalid boxes
            if w <= 0 or h <= 0:
                # Pad with previous value or 0
                val = raw_signal[-1] if raw_signal else 0
                raw_signal.append(val)
                continue

            # Define ROI: Center 50% width, Center 50% height
            # This generally captures the skin area with good blood perfusion.
            roi_x = int(x + w * 0.25)
            roi_y = int(y + h * 0.25)
            roi_w = int(w * 0.5)
            roi_h = int(h * 0.5)

            roi = frame[roi_y:roi_y+roi_h, roi_x:roi_x+roi_w]
            
            if roi.size == 0:
                val = raw_signal[-1] if raw_signal else 0
                raw_signal.append(val)
                continue

            # Extract Green Channel (Index 1 in BGR)
            # Green light is absorbed most by hemoglobin.
            g_channel = roi[:, :, 1]
            avg_val = np.mean(g_channel)
            raw_signal.append(avg_val)

        raw_signal = np.array(raw_signal)

        # 3. Signal Processing
        # Detrending: Remove non-biological trends (head movement, lighting changes)
        # We use a smoothness prior approach or simple detrending
        detrended = signal.detrend(raw_signal)

        # Normalization
        # (signal - mean) / std
        if np.std(detrended) == 0:
            result['confidence'] = 0.0
            return result
        normalized = (detrended - np.mean(detrended)) / np.std(detrended)

        # Moving Average Smoothing (to reduce camera noise)
        window = 5
        smoothed = np.convolve(normalized, np.ones(window)/window, mode='same')

        # Bandpass Filter
        # Human heart rate is typically 40-240 BPM -> 0.67 Hz to 4.0 Hz
        min_freq = 0.7
        max_freq = 4.0
        
        # Nyquist frequency
        nyquist = 0.5 * fps
        low = min_freq / nyquist
        high = max_freq / nyquist
        
        # Butterworth filter (Order 2-4 is usually sufficient)
        b, a = signal.butter(2, [low, high], btype='band')
        filtered_signal = signal.filtfilt(b, a, smoothed)

        # 4. Frequency Analysis (FFT)
        n = len(filtered_signal)
        # Zero-padding for higher spectral resolution
        fft_n = max(n, 1024) 
        fft_vals = np.abs(np.fft.rfft(filtered_signal, n=fft_n))
        freqs = np.fft.rfftfreq(fft_n, d=1.0/fps)

        # Find peak within the physiological range
        valid_idx = np.where((freqs >= min_freq) & (freqs <= max_freq))[0]
        
        if len(valid_idx) == 0:
            result['confidence'] = 0.0
            return result

        valid_fft = fft_vals[valid_idx]
        valid_freqs = freqs[valid_idx]

        peak_idx = np.argmax(valid_fft)
        peak_freq = valid_freqs[peak_idx]
        peak_power = valid_fft[peak_idx]

        # 5. Calculate Metrics
        bpm = peak_freq * 60.0

        # Calculate SNR (Signal-to-Noise Ratio)
        # SNR = (Power around peak) / (Power of noise in valid range)
        # We define "signal" as the peak +/- 0.2 Hz
        window_hz = 0.2
        signal_mask = (valid_freqs >= peak_freq - window_hz) & (valid_freqs <= peak_freq + window_hz)
        
        power_signal = np.sum(valid_fft[signal_mask]**2)
        power_total = np.sum(valid_fft**2)
        power_noise = power_total - power_signal
        
        if power_noise <= 0:
            snr = 10.0 # Arbitrary high confidence
        else:
            snr = 10 * np.log10(power_signal / power_noise)

        # 6. Populate Result
        result['bpm'] = float(bpm)
        
        # Confidence logic:
        # A strong pulse usually has SNR > 3.0-5.0 dB
        # Deepfakes often have SNR < 0.0 or random peaks.
        # We normalize specific to our application logic.
        confidence = max(0.0, min(1.0, snr / 6.0))
        result['confidence'] = float(confidence)
        
        result['signal'] = filtered_signal.tolist() # Send back for plotting
        
        result['debug'] = {
            'snr_db': float(snr),
            'peak_freq': float(peak_freq),
            'roi_samples': len(raw_signal)
        }

    except Exception as e:
        result['debug']['error'] = str(e)
        print(f"rPPG Error: {e}")

    return result