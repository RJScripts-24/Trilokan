import os
import json
from typing import Dict, Any, Optional

class ModelRegistry:
    def __init__(self, config_path: str = None):
        """
        Central manager for AI model paths and metadata.
        
        Args:
            config_path (str): Optional path to a JSON config file to auto-load 
                               the registry.
        """
        self._registry = {}
        
        # Default Base Path for models
        self.base_path = os.path.join(os.path.dirname(__file__), 'weights')
        
        # Pre-register default expected models (even if files don't exist yet)
        self._register_defaults()

        if config_path and os.path.exists(config_path):
            self.load_from_config(config_path)

    def _register_defaults(self):
        """
        Populates the registry with standard hackathon model paths.
        """
        defaults = {
            "face_landmarks": {
                "path": "shape_predictor_68_face_landmarks.dat",
                "type": "dlib",
                "description": "Dlib 68-point face aligner"
            },
            "deepfake_cnn": {
                "path": "xception_deepfake_v1.h5",
                "type": "keras",
                "description": "XceptionNet trained on FaceForensics++"
            },
            "audio_spoof": {
                "path": "rawnet2_antispoof.pth",
                "type": "pytorch",
                "description": "RawNet2 trained on ASVspoof 2019"
            },
            "asv_encoder": {
                "path": "resnet_speaker_encoder.pt",
                "type": "pytorch",
                "description": "ResNet speaker verification model"
            },
            # New CNN deepfake detectors
            "xception": {
                "path": os.path.join(os.path.dirname(__file__), "exports", "xception_ffpp.pth"),
                "type": "pytorch",
                "description": "Xception CNN for deepfake detection (FaceForensics++)"
            },
            "efficientnet": {
                "path": os.path.join(os.path.dirname(__file__), "exports", "efficientnet_b0_df.pth"),
                "type": "pytorch",
                "description": "EfficientNet-B0 CNN for deepfake detection (lightweight)"
            }
        }
        
        for name, meta in defaults.items():
            # Construct full path relative to models/weights/ or use absolute path
            if os.path.isabs(meta['path']):
                full_path = meta['path']
            else:
                full_path = os.path.join(self.base_path, meta['path'])
            self.register_model(name, full_path, meta.get('type'), meta.get('description'))

    def register_model(self, name: str, path: str, model_type: str = "generic", description: str = ""):
        """
        Registers a model path manually.

        Args:
            name (str): Unique identifier (e.g., 'deepfake_cnn').
            path (str): Absolute or relative path to the model file.
            model_type (str): Framework type ('keras', 'pytorch', 'onnx', 'dlib').
            description (str): Optional metadata.
        """
        self._registry[name] = {
            "path": os.path.abspath(path),
            "type": model_type,
            "description": description,
            "status": "REGISTERED"
        }

    def get_model_info(self, name: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves metadata for a specific model.
        """
        return self._registry.get(name)

    def get_model_path(self, name: str) -> Optional[str]:
        """
        Helper to get just the path for loading.
        """
        entry = self._registry.get(name)
        if entry:
            return entry['path']
        return None

    def check_integrity(self) -> Dict[str, bool]:
        """
        Verifies which registered models actually exist on disk.
        Useful for debugging 'Model Not Found' errors on startup.
        
        Returns:
            dict: { 'model_name': True/False }
        """
        status_report = {}
        for name, meta in self._registry.items():
            exists = os.path.exists(meta['path'])
            status_report[name] = exists
            self._registry[name]['status'] = "AVAILABLE" if exists else "MISSING"
        return status_report

    def load_from_config(self, json_path: str):
        """
        Bulk loads registry from a JSON file.
        """
        try:
            with open(json_path, 'r') as f:
                data = json.load(f)
                for name, meta in data.items():
                    self.register_model(name, meta['path'], meta.get('type'), meta.get('description'))
        except Exception as e:
            print(f"Error loading model registry config: {e}")

# Singleton Instance
_registry_instance = None

def get_registry():
    """
    Returns the singleton registry instance.
    """
    global _registry_instance
    if _registry_instance is None:
        _registry_instance = ModelRegistry()
    return _registry_instance


def get_model_path(name: str) -> str:
    """
    Convenience function to get model path from registry.
    
    Args:
        name: Model name (e.g., 'xception', 'efficientnet')
        
    Returns:
        Absolute path to model checkpoint
        
    Raises:
        ValueError: If model name not found in registry
    """
    registry = get_registry()
    path = registry.get_model_path(name)
    if path is None:
        raise ValueError(f"Model '{name}' not found in registry")
    return path

if __name__ == "__main__":
    # Quick test
    reg = get_registry()
    print("Model Integrity Check:")
    print(json.dumps(reg.check_integrity(), indent=2))