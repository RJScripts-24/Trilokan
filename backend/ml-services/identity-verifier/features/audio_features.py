
import numpy as np
import librosa

def compute_mfccs(waveform, sr, n_mfcc=13):
    """
    Compute MFCCs from audio waveform.
    Args:
        waveform (np.ndarray): Audio time series.
        sr (int): Sampling rate.
        n_mfcc (int): Number of MFCCs to return.
    Returns:
        np.ndarray: MFCC feature matrix (n_mfcc x frames)
    """
    mfccs = librosa.feature.mfcc(y=waveform, sr=sr, n_mfcc=n_mfcc)
    return mfccs

def basic_audio_stats(waveform):
    """
    Compute basic audio statistics.
    Args:
        waveform (np.ndarray): Audio time series.
    Returns:
        dict: Dictionary with mean, std, min, max, rms, zero_crossing_rate
    """
    stats = {}
    stats['mean'] = float(np.mean(waveform))
    stats['std'] = float(np.std(waveform))
    stats['min'] = float(np.min(waveform))
    stats['max'] = float(np.max(waveform))
    stats['rms'] = float(np.sqrt(np.mean(waveform**2)))
    stats['zero_crossing_rate'] = float(np.mean(librosa.feature.zero_crossing_rate(waveform)))
    return stats
