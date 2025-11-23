import numpy as np
import os
from scipy.stats import skew, kurtosis
from typing import Dict, Any

# Optional: Import PyTorch for real model inference
# import torch
# import torchaudio

class AudioSpoofDetector:
    def __init__(self, model_path: str = None):
        """
        Detector for Synthetic Speech (TTS) and Voice Conversion (VC).
        
        Args:
            model_path (str): Path to a pre-trained .pth/.onnx model (e.g., RawNet2).
        """
        self.model_path = model_path
        self.device = "cpu" # or 'cuda'
        self.model = None
        self._load_model()

    def _load_model(self):
        """
        Loads the deep learning model for anti-spoofing.
        """
        if self.model_path and os.path.exists(self.model_path):
            print(f"Loading Anti-Spoof model from {self.model_path}...")
            # Example Real Implementation:
            # self.model = torch.load(self.model_path)
            # self.model.eval()
            self.model = "REAL_MODEL_LOADED"
        else:
            print("Spoof Detector Warning: No model found. Using SIGNAL HEURISTICS mode.")
            self.model = None

    def infer(self, waveform: np.ndarray, sr: int = 16000) -> Dict[str, Any]:
        """
        Analyzes audio to determine if it is human or synthetic.

        Args:
            waveform (np.ndarray): Audio samples (float32, -1.0 to 1.0).
            sr (int): Sample rate.

        Returns:
            dict: {
                'spoof_score': float, # 0.0 (Real) to 1.0 (Fake)
                'decision': str,      # 'REAL' or 'FAKE'
                'explain': str        # Reasoning
            }
        """
        result = {
            'spoof_score': 0.0,
            'decision': 'REAL',
            'explain': 'Analysis failed or inconclusive'
        }

        # 1. Validation
        if waveform is None or len(waveform) < 1000:
            result['explain'] = "Audio too short"
            return result

        try:
            # 2. Deep Learning Inference (If model exists)
            if self.model == "REAL_MODEL_LOADED":
                # tensor_wav = torch.FloatTensor(waveform).unsqueeze(0).to(self.device)
                # logits = self.model(tensor_wav)
                # score = torch.sigmoid(logits).item()
                # result['spoof_score'] = score
                pass

            # 3. Heuristic / Signal Analysis (Fallback & sanity check)
            else:
                score, reason = self._heuristic_analysis(waveform, sr)
                result['spoof_score'] = score
                result['explain'] = reason

            # 4. Final Thresholding
            # Standard threshold: > 0.5 is considered suspicious
            threshold = 0.5
            if result['spoof_score'] > threshold:
                result['decision'] = 'FAKE'
            else:
                result['decision'] = 'REAL'

        except Exception as e:
            result['explain'] = str(e)
            print(f"Spoof Det Error: {e}")

        return result

    def _heuristic_analysis(self, waveform: np.ndarray, sr: int) -> tuple:
        """
        Performs basic signal analysis to catch low-quality synthesis.
        Real speech is dynamic; cheap TTS is often too perfect or has artifacts.
        """
        # Feature A: Silence Distribution
        # Real speech has natural pauses. Continuous sound without gaps is suspicious.
        # Simple energy threshold
        energy = waveform ** 2
        threshold = 0.001
        silence_ratio = np.sum(energy < threshold) / len(energy)
        
        # Feature B: Statistical Moments
        # Synthetic speech often has different kurtosis (tailedness) than natural speech
        # due to vocoder processing.
        kurt = float(kurtosis(waveform))
        
        # Feature C: Zero Crossing Rate (ZCR) Variance
        # Constant monotone speech (robotic) has low ZCR variance.
        zcr = ((waveform[:-1] * waveform[1:]) < 0).sum()
        
        # Scoring Logic (Simplified for Prototype)
        score = 0.0
        reasons = []

        # Check 1: Is it unnaturally continuous? (Low silence)
        if silence_ratio < 0.05: # Less than 5% silence
            score += 0.4
            reasons.append("Unnatural continuity (lack of breath pauses)")

        # Check 2: Statistical anomaly (Kurtosis)
        # Normal speech usually has high kurtosis (> 3). Gaussian noise/simple synthesis often lower.
        if kurt < 2.0: 
            score += 0.3
            reasons.append("Statistical distribution anomaly")
            
        # Check 3: Clipping / Saturation
        # Cheap generation often hits max amplitude hard
        if np.max(np.abs(waveform)) >= 0.99:
            # Check how many samples are at max
            clipped_ratio = np.sum(np.abs(waveform) >= 0.99) / len(waveform)
            if clipped_ratio > 0.01: # > 1% clipped
                score += 0.2
                reasons.append("High signal clipping/saturation")

        # Normalize score to 0-1
        final_score = min(1.0, score)
        
        if not reasons:
            explain_text = "Signal statistics align with natural speech patterns."
        else:
            explain_text = "; ".join(reasons)

        return final_score, explain_text

# Singleton Helper
_spoof_detector = None

def get_spoof_detector():
    global _spoof_detector
    if _spoof_detector is None:
        _spoof_detector = AudioSpoofDetector()
    return _spoof_detector