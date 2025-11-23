"""
CNN-based deepfake detection factory and legacy compatibility.
Provides get_detector() for new pipeline and maintains backward compatibility.
"""

import cv2
import numpy as np
import os
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

# Check if torch is available
try:
    import torch
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    torch = None


def get_detector(name: str = 'xception', checkpoint: Optional[str] = None):
    """
    Factory function to get deepfake detector wrapper.
    
    Args:
        name: Model name ('xception' or 'efficientnet')
        checkpoint: Optional custom checkpoint path. If None, uses model registry default.
        
    Returns:
        Detector wrapper with predict() method
        
    Raises:
        ImportError: If PyTorch is not installed
        
    Example:
        >>> detector = get_detector(name='xception')
        >>> probs = detector.predict(face_crops, batch_size=32)
    """
    if not HAS_TORCH:
        raise ImportError(
            "PyTorch is not installed. CNN deepfake detection requires PyTorch. "
            "To use CNN models, activate the ML environment: conda activate idv-ml"
        )
    
    from models.model_registry import get_model_path
    
    # Get default checkpoint from registry if not provided
    if checkpoint is None:
        try:
            checkpoint = get_model_path(name)
        except Exception as e:
            logger.warning(f"Could not get checkpoint from registry: {e}")
            # Fallback to default paths
            if name == 'xception':
                checkpoint = os.path.join(
                    os.path.dirname(__file__),
                    'exports',
                    'xception_ffpp.pth'
                )
            elif name == 'efficientnet':
                checkpoint = os.path.join(
                    os.path.dirname(__file__),
                    'exports',
                    'efficientnet_b0_df.pth'
                )
            else:
                raise ValueError(f"Unknown model name: {name}")
    
    # Instantiate wrapper
    if name == 'xception':
        from models.xception_wrapper import XceptionWrapper
        detector = XceptionWrapper(checkpoint_path=checkpoint)
    elif name == 'efficientnet':
        from models.efficientnet_wrapper import EfficientNetWrapper
        detector = EfficientNetWrapper(checkpoint_path=checkpoint)
    else:
        raise ValueError(
            f"Unknown model name '{name}'. "
            f"Supported: 'xception', 'efficientnet'"
        )
    
    logger.info(f"Loaded {name} detector from {checkpoint}")
    return detector


# ============================================================================
# Legacy DeepfakeCNN class for backward compatibility
# ============================================================================

class DeepfakeCNN:
    """
    Legacy wrapper for the Deepfake Detection CNN.
    Maintained for backward compatibility with existing code.
    
    New code should use get_detector() and inference.deepfake_inference module.
    """
    
    def __init__(self, model_path: str = None):
        """
        Wrapper for the Deepfake Detection CNN.
        
        Args:
            model_path (str): Path to the trained model weights.
        """
        self.model_path = model_path
        self.input_size = (299, 299) # Standard for Xception/Inception
        self.model = None
        self._load_model()

    def _load_model(self):
        """
        Loads the CNN model into memory.
        """
        if self.model_path and os.path.exists(self.model_path):
            logger.info(f"Loading Deepfake CNN from {self.model_path}...")
            # Example for Keras:
            # self.model = tf.keras.models.load_model(self.model_path)
            # Example for PyTorch:
            # self.model = torch.load(self.model_path)
            self.model = "REAL_MODEL_LOADED"
        else:
            logger.warning("Deepfake CNN Warning: No model found. Using TEXTURE-GRADIENT heuristics.")
            self.model = None

    def infer_face_crop(self, face_crop: np.ndarray) -> Dict[str, Any]:
        """
        Analyzes a single face crop to detect generation artifacts.

        Args:
            face_crop (np.ndarray): Cropped face image (BGR).

        Returns:
            dict: {
                'score': float,       # 0.0 (Real) to 1.0 (Fake)
                'explain': str,       # Reason for decision
                'confidence': float   # Reliability of inference
            }
        """
        result = {
            'score': 0.0,
            'explain': 'Inconclusive',
            'confidence': 0.0
        }

        # 1. Validation
        if face_crop is None or face_crop.size == 0:
            result['explain'] = "Invalid input image"
            return result

        try:
            # 2. Preprocessing
            # Resize to model input requirement
            resized = cv2.resize(face_crop, self.input_size)
            
            # Normalize pixel values (-1 to 1 is common for Xception)
            normalized = (resized.astype(np.float32) / 127.5) - 1.0

            # 3. Inference
            if self.model == "REAL_MODEL_LOADED":
                # Real Inference Logic
                # batch = np.expand_dims(normalized, axis=0)
                # prediction = self.model.predict(batch)[0][0]
                # result['score'] = float(prediction)
                # result['confidence'] = 0.95
                pass
            
            else:
                # Mock Inference (Heuristic Fallback)
                # We analyze gradient statistics. Deepfakes often lack high-freq texture 
                # (smoothing) or have distinct grid patterns (checkerboard artifacts).
                
                # Convert original crop to Gray for analysis
                if len(face_crop.shape) == 3:
                    gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
                else:
                    gray = face_crop

                # Calculate Laplacian Variance (Texture Sharpness)
                laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
                
                # Calculate FFT (Frequency Domain Artifacts)
                f = np.fft.fft2(gray)
                fshift = np.fft.fftshift(f)
                magnitude_spectrum = 20 * np.log(np.abs(fshift) + 1e-9)
                high_freq_energy = np.mean(magnitude_spectrum > 100) # Arbitrary threshold

                # Scoring Logic
                # If image is strangely smooth (low var) but high res -> Suspicious
                # If image has abnormal high-freq spikes (grid artifact) -> Suspicious
                
                fake_prob = 0.1 # Base probability

                if laplacian_var < 100: 
                    # Too smooth (potential smoothing artifact)
                    fake_prob += 0.3
                    result['explain'] = "Unnatural smoothing detected"
                elif high_freq_energy > 0.5:
                    # Noisy high freq (potential GAN grid)
                    fake_prob += 0.4
                    result['explain'] = "High-frequency spectral artifacts"
                else:
                    result['explain'] = "Texture statistics consistent with real camera"

                # Clamp score
                result['score'] = min(0.99, fake_prob)
                
                # Confidence is lower for heuristic mode
                result['confidence'] = 0.6

        except Exception as e:
            result['explain'] = f"Error: {str(e)}"
            logger.error(f"CNN Deepfake Error: {e}")

        return result


# Alias for compatibility with imports
CNNDeepfakeDetector = DeepfakeCNN

# Singleton Helper
_cnn_instance = None

def get_deepfake_cnn():
    """Legacy singleton getter. New code should use get_detector()."""
    global _cnn_instance
    if _cnn_instance is None:
        _cnn_instance = DeepfakeCNN()
    return _cnn_instance