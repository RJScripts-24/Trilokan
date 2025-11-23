"""
audio_utils.py
Purpose: Audio reading, resampling, and VAD utilities.
"""
import librosa
import soundfile as sf
import numpy as np
import webrtcvad

class Segment:
    def __init__(self, start, end, data):
        self.start = start  # seconds
        self.end = end      # seconds
        self.data = data    # numpy array (audio samples)

    def __repr__(self):
        return f"Segment(start={self.start:.2f}, end={self.end:.2f}, len={len(self.data)})"

def load_audio(path, target_sr=16000, mono=True):
    """
    Load audio file and return waveform (numpy array) and sample rate.
    Args:
        path (str): Path to audio file.
        target_sr (int): Target sample rate for resampling.
        mono (bool): Convert to mono if True.
    Returns:
        waveform (np.ndarray): Audio samples (float32, -1.0 to 1.0)
        sr (int): Sample rate
    """
    waveform, sr = librosa.load(path, sr=target_sr, mono=mono)
    return waveform, sr

def get_vad_segments(waveform, sr, frame_ms=30, aggressiveness=2):
    """
    Perform Voice Activity Detection (VAD) on waveform.
    Args:
        waveform (np.ndarray): Audio samples (float32, -1.0 to 1.0)
        sr (int): Sample rate
        frame_ms (int): Frame size in ms (10, 20, or 30)
        aggressiveness (int): VAD aggressiveness (0-3)
    Returns:
        List[Segment]: List of speech segments
    """
    vad = webrtcvad.Vad(aggressiveness)
    # Convert float32 waveform to 16-bit PCM
    int16_audio = np.clip(waveform * 32768, -32768, 32767).astype(np.int16)
    bytes_audio = int16_audio.tobytes()
    frame_len = int(sr * frame_ms / 1000)
    bytes_per_frame = frame_len * 2  # 2 bytes per sample
    num_frames = len(int16_audio) // frame_len
    speech_frames = []
    for i in range(num_frames):
        start = i * bytes_per_frame
        stop = start + bytes_per_frame
        frame = bytes_audio[start:stop]
        if len(frame) < bytes_per_frame:
            break
        is_speech = vad.is_speech(frame, sr)
        speech_frames.append(is_speech)
    # Group consecutive speech frames into segments
    segments = []
    in_segment = False
    seg_start = 0
    for i, is_speech in enumerate(speech_frames):
        if is_speech and not in_segment:
            in_segment = True
            seg_start = i
        elif not is_speech and in_segment:
            in_segment = False
            seg_end = i
            start_sec = seg_start * frame_ms / 1000.0
            end_sec = seg_end * frame_ms / 1000.0
            data = int16_audio[seg_start*frame_len:seg_end*frame_len]
            segments.append(Segment(start_sec, end_sec, data))
    # Handle case where file ends with speech
    if in_segment:
        seg_end = len(speech_frames)
        start_sec = seg_start * frame_ms / 1000.0
        end_sec = seg_end * frame_ms / 1000.0
        data = int16_audio[seg_start*frame_len:seg_end*frame_len]
        segments.append(Segment(start_sec, end_sec, data))
    return segments
