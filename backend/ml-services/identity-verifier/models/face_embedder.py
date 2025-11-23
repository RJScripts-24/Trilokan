import numpy as np
from typing import Dict, Any, Optional

# Import the core logic from the features layer
# Ensure features/ is in your PYTHONPATH
try:
    from features.face_embedding import compute_embedding
except ImportError:
    # Fallback if running standalone without package structure
    print("Warning: Could not import features.face_embedding. Logic may fail.")
    compute_embedding = None

class FaceEmbedder:
    def __init__(self, model_name: str = "dlib_face_recognition"):
        """
        Wrapper for the Face Recognition / Embedding model.
        
        Args:
            model_name (str): Identifier for the underlying backend (e.g., 'dlib', 'arcface').
        """
        self.model_name = model_name
        # The actual model loading is handled lazily in features.face_embedding
        # or can be initialized here if using a custom TensorFlow/PyTorch model.
        print(f"FaceEmbedder initialized with backend: {model_name}")

    def infer(self, face_crop: np.ndarray) -> Dict[str, Any]:
        """
        Generates a vector representation for a given face.

        Args:
            face_crop (np.ndarray): Cropped face image (BGR/RGB).

        Returns:
            dict: {
                'embedding': np.ndarray, # 128-d vector (or similar)
                'shape': tuple,          # Shape of vector
                'success': bool,
                'error': str
            }
        """
        result = {
            'embedding': None,
            'shape': None,
            'success': False,
            'error': None
        }

        if face_crop is None or face_crop.size == 0:
            result['error'] = "Empty face crop provided"
            return result

        try:
            if compute_embedding:
                # Delegate to the feature extractor
                vector = compute_embedding(face_crop)
                
                if vector is not None:
                    result['embedding'] = vector
                    result['shape'] = vector.shape
                    result['success'] = True
                else:
                    result['error'] = "No face detected or encoding failed"
            else:
                result['error'] = "Feature extractor not linked"

        except Exception as e:
            result['error'] = str(e)
            print(f"FaceEmbedder Inference Error: {e}")

        return result

# Singleton Helper
_embedder_instance = None

def get_face_embedder():
    """
    Returns a singleton instance of the FaceEmbedder.
    """
    global _embedder_instance
    if _embedder_instance is None:
        _embedder_instance = FaceEmbedder()
    return _embedder_instance