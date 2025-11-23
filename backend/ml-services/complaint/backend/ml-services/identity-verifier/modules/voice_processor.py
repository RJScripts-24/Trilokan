import librosa
import numpy as np
import os
import logging
import soundfile as sf

# Configure logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# --- Constants for Analysis ---

# 1. Silence: We expect the non-silent parts to be a reasonable chunk of the audio.
# If an audio is >95% silent or <5% silent, it's suspicious.
SILENCE_THRESHOLD_DB = 40  # Anything 40dB below the max is considered silence
MIN_NON_SILENT_RATIO = 0.05  # Must be at least 5% non-silent
MAX_NON_SILENT_RATIO = 0.95  # Must be no more than 95% non-silent

# 2. Pitch: We check the standard deviation of the pitch.
# A very low standard deviation means the voice is monotone (robotic).
MIN_PITCH_VARIATION = 5.0  # (in Hz) If pitch std dev is below this, flag as monotone.

# 3. Spectral Flatness: Measures how "tonal" vs "noisy" the audio is.
# Very high flatness can be noise; very low can be an unnaturally "pure" tone.
MIN_SPECTRAL_FLATNESS = 0.001
MAX_SPECTRAL_FLATNESS = 0.1

def analyze_voice(audio_path):
    """
    Analyzes an audio file to perform heuristic checks for voice spoofing (voice clones).
    This is a PROTOTYPE and simulates AI artifact detection.
    
    Args:
        audio_path (str): The file path to the uploaded audio.

    Returns:
        dict: A dictionary containing the analysis results.
    """
    log.info(f"Starting voice analysis for: {audio_path}")

    try:
        # --- 1. Load Audio File ---
        # Librosa's load function resamples to 22050 Hz by default
        # and converts to mono, which is perfect for this analysis.
        
        # We must use soundfile to read the file first, as librosa can struggle
        # with some compressed formats sent from browsers (like .webm)
        with open(audio_path, 'rb') as f:
            y, sr = sf.read(f)
        
        # If the file is stereo, convert to mono by averaging channels
        if y.ndim > 1:
            y = np.mean(y, axis=1)

        log.info(f"Audio loaded. Sample rate: {sr}, Duration: {len(y)/sr:.2f}s")

        if len(y) < sr * 0.5:  # Check if audio is at least 0.5 seconds
            return {
                'status': 'failed',
                'message': 'Audio file is too short to analyze.',
                'overall_pass': False
            }

        # --- 2. Liveness Check 1: Silence Analysis ---
        # Split audio into non-silent parts
        non_silent_intervals = librosa.effects.split(y, top_db=SILENCE_THRESHOLD_DB)
        non_silent_duration = np.sum([end - start for start, end in non_silent_intervals]) / sr
        total_duration = len(y) / sr
        non_silent_ratio = non_silent_duration / total_duration

        is_natural_silence = MIN_NON_SILENT_RATIO < non_silent_ratio < MAX_NON_SILENT_RATIO
        log.info(f"Non-silent ratio: {non_silent_ratio:.2f}. Pass: {is_natural_silence}")

        # --- 3. Liveness Check 2: Pitch Variation (Monotone Check) ---
        # Extract fundamental frequency (pitch)
        pitches, magnitudes = librosa.core.piptrack(y=y, sr=sr)
        
        # Get the dominant pitch from each frame
        pitch_values = []
        for t in range(pitches.shape[1]):
            index = magnitudes[:, t].argmax()
            pitch = pitches[index, t]
            if pitch > 0:  # Only count valid pitch frames
                pitch_values.append(pitch)
        
        if len(pitch_values) < 10:  # Not enough voice data to analyze pitch
            log.warning("Could not find enough pitch data to analyze.")
            pitch_variation = 0
            is_natural_pitch = False
        else:
            pitch_variation = np.std(pitch_values)
            is_natural_pitch = pitch_variation > MIN_PITCH_VARIATION
        
        log.info(f"Pitch variation (Std Dev): {pitch_variation:.2f} Hz. Pass: {is_natural_pitch}")

        # --- 4. Liveness Check 3: Spectral Flatness (Artifact Check) ---
        spectral_flatness = np.mean(librosa.feature.spectral_flatness(y=y))
        
        is_natural_spectrum = MIN_SPECTRAL_FLATNESS < spectral_flatness < MAX_SPECTRAL_FLATNESS
        log.info(f"Spectral flatness: {spectral_flatness:.4f}. Pass: {is_natural_spectrum}")

    except Exception as e:
        log.error(f"Error during audio processing: {e}", exc_info=True)
        # This can happen if ffmpeg isn't installed or the file is corrupt
        return {'status': 'error', 'message': f'Internal audio processing error: {e}'}

    # --- 5. Final Verdict ---
    overall_pass = is_natural_silence and is_natural_pitch and is_natural_spectrum

    # Build Response Dictionary
    result = {
        'status': 'success',
        'message': 'Voice analysis complete.',
        'overall_pass': overall_pass,
        'checks': [
            {
                'name': 'Silence Analysis',
                'passed': is_natural_silence,
                'details': f'Audio has a natural amount of speech ({non_silent_ratio*100:.0f}% spoken).' if is_natural_silence else 'Audio has unnatural silence patterns (either too much or too little speech).'
            },
            {
                'name': 'Pitch Variation (Monotone Check)',
                'passed': is_natural_pitch,
                'details': f'Natural pitch variation detected (Std Dev: {pitch_variation:.2f} Hz).' if is_natural_pitch else f'Voice sounds robotic or monotone (Std Dev: {pitch_variation:.2f} Hz).'
            },
            {
                'name': 'Spectral Analysis (Artifact Check)',
                'passed': is_natural_spectrum,
                'details': 'Audio spectrum appears natural.' if is_natural_spectrum else 'Acoustic artifacts detected (unnatural spectral flatness).'
            }
        ]
    }
    
    log.info(f"Analysis result: {result}")
    return result

# --- Main block for testing ---
if __name__ == "__main__":
    # You can test this script by placing an audio file named 'test_audio.wav'
    # in the 'identity-verifier' directory and running 'python modules/voice_processor.py'
    
    # This path is relative to the root of the 'identity-verifier' service
    test_audio_path = '../test_audio.wav' 
    
    if not os.path.exists(test_audio_path):
        print(f"Test audio not found at {test_audio_path}")
        print("Please add a .wav file to test.")
    else:
        print(f"Running test analysis on {test_audio_path}...")
        results = analyze_voice(test_audio_path)
        import json
        print(json.dumps(results, indent=2))