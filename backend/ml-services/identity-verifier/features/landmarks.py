import cv2
import numpy as np
from scipy.spatial.distance import cosine
from typing import List, Dict, Any, Optional

# Try importing the standard face_recognition library
# pip install face_recognition
try:
    import face_recognition
    FRAMEWORK = "face_recognition"
except ImportError:
    FRAMEWORK = "cv2_dnn" # Fallback or placeholder

# Global model cache
_Embedder_Model = None

def _get_embedding_model():
    """
    Lazy loader for the face recognition model to avoid heavy startup costs.
    """
    global _Embedder_Model
    if _Embedder_Model is None:
        if FRAMEWORK == "face_recognition":
            # dlib's models are loaded automatically by the library
            _Embedder_Model = True 
        elif FRAMEWORK == "cv2_dnn":
            # Placeholder for OpenCV DNN Face Recognizer (e.g., OpenFace)
            # In a real deployment, load 'openface_nn4.small2.v1.t7' here
            pass
    return _Embedder_Model

def compute_embedding(face_crop: np.ndarray) -> Optional[np.ndarray]:
    """
    Generates a numerical vector (embedding) representing the face.

    Args:
        face_crop (np.ndarray): Cropped face image (BGR or RGB).

    Returns:
        np.ndarray: A 1D vector (usually 128-float), or None if encoding fails.
    """
    if face_crop is None or face_crop.size == 0:
        return None

    _get_embedding_model()

    try:
        # 1. Preprocessing
        # face_recognition expects RGB
        if len(face_crop.shape) == 3:
            rgb_face = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
        else:
            # Convert gray to RGB
            rgb_face = cv2.cvtColor(face_crop, cv2.COLOR_GRAY2RGB)

        # 2. Inference
        if FRAMEWORK == "face_recognition":
            # We assume the crop is already the face, so we pass known_face_locations
            # Format: (top, right, bottom, left) -> (0, width, height, 0)
            h, w, _ = rgb_face.shape
            encodings = face_recognition.face_encodings(rgb_face, known_face_locations=[(0, w, h, 0)])
            
            if encodings:
                return encodings[0]
            else:
                return None
        
        else:
            # Mock implementation for when dlib is missing (for testing pipeline)
            # Returns a random normalized vector
            dummy_vec = np.random.rand(128).astype(np.float32)
            return dummy_vec / np.linalg.norm(dummy_vec)

    except Exception as e:
        print(f"Embedding Error: {e}")
        return None

def embedding_stability(embeddings: List[np.ndarray]) -> Dict[str, Any]:
    """
    Calculates how stable the face identity is across a sequence of frames.
    
    Deepfakes often exhibit "identity drift" or jitter in the embedding space 
    due to frame-by-frame synthesis inconsistencies. Real faces are stable.

    Args:
        embeddings (List[np.ndarray]): List of embedding vectors from a video sequence.

    Returns:
        dict: {
            'value': float,      # Stability score (0.0 to 1.0). 1.0 = Perfectly stable.
            'confidence': float, # Reliability based on sample size.
            'debug': dict
        }
    """
    result = {
        'value': 0.0,
        'confidence': 0.0,
        'debug': {}
    }

    # Filter out None values
    valid_embeddings = [e for e in embeddings if e is not None]

    if len(valid_embeddings) < 2:
        result['debug']['error'] = "Insufficient embeddings for stability check"
        return result

    try:
        # 1. Calculate Pairwise Distances
        # We compute the cosine distance between consecutive frames.
        # Distance 0 = Identical, Distance 1 = Orthogonal (Different people typically > 0.6)
        distances = []
        for i in range(1, len(valid_embeddings)):
            u = valid_embeddings[i-1]
            v = valid_embeddings[i]
            
            # cosine() returns distance (1 - similarity)
            dist = cosine(u, v)
            distances.append(dist)

        # 2. Compute Stability Metrics
        avg_dist = np.mean(distances)
        max_dist = np.max(distances) # Peaks usually indicate a glitch or deepfake artifact
        
        # 3. Normalize to a Score
        # A real person usually has frame-to-frame distance < 0.05
        # A deepfake might spike to > 0.1 or 0.2 occasionally.
        # We define stability as: 1.0 - (scaled_distance)
        
        # Scale: if avg_dist is 0.0 -> score 1.0
        # if avg_dist is 0.2 -> score 0.0
        stability_score = max(0.0, 1.0 - (avg_dist * 5.0))

        result['value'] = float(stability_score)

        # 4. Confidence
        # More frames = higher confidence in the trend
        sample_reliability = min(1.0, len(valid_embeddings) / 10.0)
        result['confidence'] = float(sample_reliability)

        result['debug'] = {
            'num_samples': len(valid_embeddings),
            'avg_cosine_dist': float(avg_dist),
            'max_cosine_dist': float(max_dist),
            'distances': [float(d) for d in distances]
        }

    except Exception as e:
        result['debug']['error'] = str(e)
        print(f"Stability Check Error: {e}")

    return result