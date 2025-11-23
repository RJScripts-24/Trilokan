"""
EfficientNet-based deepfake detector wrapper.
Lighter-weight alternative for real-time inference with CPU fallback.
"""

import logging
from typing import List
import numpy as np

# Lazy import torch to avoid crashes in non-ML environments
try:
    import torch
    import torch.nn as nn
    from torchvision import transforms
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    torch = None
    nn = None
    transforms = None

from PIL import Image

logger = logging.getLogger(__name__)


class EfficientNetWrapper:
    """
    Wrapper for EfficientNet-B0 deepfake detection model.
    Faster alternative to Xception for real-time scenarios.
    """
    
    INPUT_SIZE = 224
    IMAGENET_MEAN = [0.485, 0.456, 0.406]
    IMAGENET_STD = [0.229, 0.224, 0.225]
    
    def __init__(self, checkpoint_path: str, device: str = 'cuda'):
        """
        Initialize EfficientNet wrapper.
        
        Args:
            checkpoint_path: Path to model checkpoint (.pth file)
            device: Target device ('cuda' or 'cpu')
        """
        if not HAS_TORCH:
            raise ImportError(
                "PyTorch is not installed. EfficientNet model requires PyTorch. "
                "Please install it via: conda activate idv-ml"
            )
        
        self.checkpoint_path = checkpoint_path
        
        # Determine device with graceful fallback
        if device == 'cuda' and not torch.cuda.is_available():
            logger.warning("CUDA requested but not available. Falling back to CPU.")
            device = 'cpu'
        self.device = torch.device(device)
        
        # Initialize model
        self.model = self._build_model()
        self._load_checkpoint()
        self.model.to(self.device)
        self.model.eval()
        
        # Preprocessing transforms
        self.transform = transforms.Compose([
            transforms.Resize((self.INPUT_SIZE, self.INPUT_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(mean=self.IMAGENET_MEAN, std=self.IMAGENET_STD)
        ])
        
        logger.info(f"EfficientNetWrapper initialized on {self.device}")
    
    def _build_model(self) -> nn.Module:
        """
        Build EfficientNet-B0 architecture for binary classification.
        """
        try:
            # Try timm first
            import timm
            model = timm.create_model('efficientnet_b0', pretrained=False, num_classes=1)
        except ImportError:
            # Fallback to torchvision
            try:
                from torchvision.models import efficientnet_b0
                model = efficientnet_b0(pretrained=False)
                # Replace classifier
                model.classifier[1] = nn.Linear(model.classifier[1].in_features, 1)
            except ImportError:
                logger.error("Neither timm nor torchvision.models available")
                raise ImportError(
                    "Please install timm or torchvision for EfficientNet support: "
                    "pip install timm"
                )
        
        return model
    
    def _load_checkpoint(self):
        """Load model weights from checkpoint file."""
        try:
            checkpoint = torch.load(
                self.checkpoint_path,
                map_location=self.device,
                weights_only=True
            )
            
            # Handle different checkpoint formats
            if isinstance(checkpoint, dict):
                if 'model_state_dict' in checkpoint:
                    self.model.load_state_dict(checkpoint['model_state_dict'])
                elif 'state_dict' in checkpoint:
                    self.model.load_state_dict(checkpoint['state_dict'])
                else:
                    self.model.load_state_dict(checkpoint)
            else:
                self.model.load_state_dict(checkpoint)
            
            logger.info(f"Loaded checkpoint from {self.checkpoint_path}")
        except FileNotFoundError:
            logger.warning(
                f"Checkpoint not found at {self.checkpoint_path}. "
                f"Model will use random initialization. "
                f"Please download checkpoint to models/exports/"
            )
        except Exception as e:
            logger.error(f"Error loading checkpoint: {e}")
            raise
    
    def _preprocess_frame(self, frame: np.ndarray) -> torch.Tensor:
        """
        Preprocess single frame for model input.
        
        Args:
            frame: HxWx3 uint8 RGB numpy array
            
        Returns:
            Preprocessed tensor (1, 3, 224, 224)
        """
        # Convert numpy to PIL
        if frame.dtype != np.uint8:
            frame = (frame * 255).astype(np.uint8)
        
        pil_image = Image.fromarray(frame)
        
        # Apply transforms
        tensor = self.transform(pil_image)
        
        return tensor.unsqueeze(0)  # Add batch dimension
    
    def predict(self, frames: List[np.ndarray], batch_size: int = 32) -> List[float]:
        """
        Run inference on face-cropped frames.
        
        Args:
            frames: List of HxWx3 uint8 RGB face-crop images
            batch_size: Batch size for inference
            
        Returns:
            List of probabilities (0.0=real, 1.0=fake) same length as input
        """
        if not frames:
            return []
        
        all_probs = []
        
        with torch.no_grad():
            # Process in batches
            for i in range(0, len(frames), batch_size):
                batch_frames = frames[i:i + batch_size]
                
                # Preprocess batch
                batch_tensors = [
                    self._preprocess_frame(frame) for frame in batch_frames
                ]
                batch = torch.cat(batch_tensors, dim=0).to(self.device)
                
                # Forward pass
                logits = self.model(batch)
                
                # Convert to probabilities
                if logits.shape[-1] == 1:
                    # Binary classification with single output
                    probs = torch.sigmoid(logits).squeeze(-1)
                else:
                    # Multi-class (take class 1 probability)
                    probs = torch.softmax(logits, dim=-1)[:, 1]
                
                # Move to CPU and convert to list
                all_probs.extend(probs.cpu().numpy().tolist())
        
        return all_probs
    
    def __call__(self, frames: List[np.ndarray], batch_size: int = 32) -> List[float]:
        """Convenience method for prediction."""
        return self.predict(frames, batch_size)
