import numpy as np
from scipy.spatial.distance import cosine
from typing import Dict, Any, Optional, Union
import os

# Optional: Import a real speaker encoder library
# from resemblyzer import VoiceEncoder, preprocess_wav
# import librosa

class SpeakerVerifier:
    def __init__(self, model_path: str = None):
        """
        Wrapper for the Speaker Verification model.
        
        Args:
            model_path (str): Path to a pre-trained ASV model (e.g., .pt or .h5).
                              If None, runs in mock mode for testing.
        """
        self.model_path = model_path
        self.model = None
        self._load_model()
        
        # In-memory store for enrolled profiles (in prod, use a DB)
        # Format: { 'user_id': np.ndarray(embedding) }
        self.enrollment_db = {}

    def _load_model(self):
        """
        Loads the underlying neural network (e.g., ECAPA-TDNN, Resemblyzer).
        """
        try:
            if self.model_path and os.path.exists(self.model_path):
                print(f"Loading ASV model from {self.model_path}...")
                # self.model = VoiceEncoder(weights_fpath=self.model_path)
                self.model = "REAL_MODEL_LOADED"
            else:
                print("ASV Warning: No model path provided. Using MOCK embedding mode.")
                self.model = None
        except Exception as e:
            print(f"Failed to load ASV model: {e}")
            self.model = None

    def _extract_embedding(self, waveform: np.ndarray, sr: int = 16000) -> np.ndarray:
        """
        Converts raw audio into a fixed-size speaker vector (d-vector/x-vector).
        """
        # 1. Real Inference
        if self.model == "REAL_MODEL_LOADED":
            # Example implementation with Resemblyzer:
            # wav = preprocess_wav(waveform) # Normalization
            # embed = self.model.embed_utterance(wav)
            # return embed
            pass

        # 2. Mock Inference (Simulated for Hackathon/Testing)
        # We simulate a vector based on simple audio stats so it's deterministic.
        # This allows "same audio" to match "same audio" even without a neural net.
        
        # Normalize
        if np.max(np.abs(waveform)) > 0:
            norm_wav = waveform / np.max(np.abs(waveform))
        else:
            norm_wav = waveform

        # Create a pseudo-embedding using FFT statistics (256-dim vector)
        # This ensures that the same voice (audio file) yields the same vector.
        fft_vals = np.abs(np.fft.rfft(norm_wav[:4096], n=512)) # First 4096 samples
        vector = fft_vals[:256] 
        
        # Pad if audio was too short
        if len(vector) < 256:
            vector = np.pad(vector, (0, 256 - len(vector)))
            
        return vector / (np.linalg.norm(vector) + 1e-6)

    def enroll(self, user_id: str, waveform: np.ndarray, sr: int = 16000) -> Dict[str, Any]:
        """
        Registers a user's voiceprint in the system.
        
        Args:
            user_id (str): Unique identifier for the user.
            waveform (np.ndarray): Audio data (float32).
            sr (int): Sample rate.

        Returns:
            dict: Metadata about the enrollment.
        """
        if waveform is None or len(waveform) == 0:
            return {'success': False, 'error': 'Empty waveform'}

        try:
            embedding = self._extract_embedding(waveform, sr)
            
            # Store in memory (or save to DB in real app)
            self.enrollment_db[user_id] = embedding
            
            return {
                'success': True, 
                'user_id': user_id, 
                'vector_shape': embedding.shape
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def asv_score(
        self, 
        user_id: Union[str, np.ndarray], 
        waveform: np.ndarray, 
        sr: int = 16000
    ) -> Dict[str, Any]:
        """
        Compares new audio against an enrolled profile.

        Args:
            user_id: Either the user_id string (to look up DB) or a raw embedding vector.
            waveform: The new audio to verify.

        Returns:
            dict: {
                'score': float,      # Similarity (0.0 to 1.0)
                'match': bool,       # True if > threshold
                'confidence': float  # Quality of audio
            }
        """
        result = {'score': 0.0, 'match': False, 'confidence': 0.0}

        # 1. Resolve Enrolled Vector
        enrolled_vec = None
        if isinstance(user_id, str):
            enrolled_vec = self.enrollment_db.get(user_id)
            if enrolled_vec is None:
                result['error'] = "User not enrolled"
                return result
        else:
            enrolled_vec = user_id

        if waveform is None or len(waveform) < 100:
            result['error'] = "Audio too short"
            return result

        try:
            # 2. Extract New Vector
            probe_vec = self._extract_embedding(waveform, sr)

            # 3. Compute Cosine Similarity
            # Cosine Distance = 1 - Cosine Similarity
            # We want Similarity: 1.0 = Same, -1.0 = Opposite
            dist = cosine(enrolled_vec, probe_vec)
            similarity = 1.0 - dist
            
            # Clip to 0-1 range for easier logic
            similarity = max(0.0, min(1.0, similarity))

            result['score'] = float(similarity)

            # 4. Decision Logic
            # Standard threshold for ASV is usually around 0.7 to 0.8
            threshold = 0.75
            result['match'] = bool(similarity > threshold)

            # 5. Confidence (based on audio length/energy)
            rms = np.sqrt(np.mean(waveform**2))
            # If audio is silent or extremely short, confidence is low
            duration_conf = min(1.0, len(waveform) / (sr * 2)) # Want at least 2 secs
            energy_conf = min(1.0, rms / 0.01) # Want reasonable volume
            
            result['confidence'] = float(duration_conf * energy_conf)

        except Exception as e:
            result['error'] = str(e)
            print(f"ASV Score Error: {e}")

        return result

# Alias for compatibility with imports
ASVSystem = SpeakerVerifier

# Global singleton for easy import
_verifier_instance = None

def get_asv_model():
    global _verifier_instance
    if _verifier_instance is None:
        _verifier_instance = SpeakerVerifier()
    return _verifier_instance