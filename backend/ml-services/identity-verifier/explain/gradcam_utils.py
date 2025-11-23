"""
Grad-CAM utilities for deepfake detection explainability.
Generates heatmaps highlighting suspicious regions in face images.
"""

import logging
from typing import List, Optional, Tuple
import numpy as np
import cv2

try:
    import torch
    import torch.nn.functional as F
    HAS_TORCH = True
except Exception:
    logging.warning("Torch not installed — Grad-CAM will run in fallback mode.")
    HAS_TORCH = False
    torch = None

logger = logging.getLogger(__name__)


class GradCAM:
    """
    Gradient-weighted Class Activation Mapping for CNN explanations.
    Highlights which regions of the face contributed most to fake classification.
    """
    
    def __init__(self, model, target_layer: Optional = None):
        """
        Initialize Grad-CAM.
        
        Args:
            model: PyTorch model (or None if torch unavailable)
            target_layer: Layer to compute gradients for. If None, uses last conv layer.
        """
        if not HAS_TORCH:
            raise ImportError("PyTorch is required for Grad-CAM but is not installed")
        
        self.model = model
        self.model.eval()
        
        # Find target layer if not specified
        if target_layer is None:
            target_layer = self._find_last_conv_layer()
        
        self.target_layer = target_layer
        
        # Hooks for gradients and activations
        self.gradients = None
        self.activations = None
        
        # Register hooks
        self.target_layer.register_forward_hook(self._save_activation)
        self.target_layer.register_backward_hook(self._save_gradient)
    
    def _find_last_conv_layer(self):
        """Find the last convolutional layer in the model."""
        last_conv = None
        
        for module in self.model.modules():
            if isinstance(module, torch.nn.Conv2d):
                last_conv = module
        
        if last_conv is None:
            raise ValueError("No convolutional layers found in model")
        
        logger.debug(f"Using layer for Grad-CAM: {last_conv}")
        return last_conv
    
    def _save_activation(self, module, input, output):
        """Hook to save forward pass activations."""
        self.activations = output.detach()
    
    def _save_gradient(self, module, grad_input, grad_output):
        """Hook to save backward pass gradients."""
        self.gradients = grad_output[0].detach()
    
    def generate_cam(self, input_tensor, target_class: int = 1) -> np.ndarray:
        """
        Generate Class Activation Map.
        
        Args:
            input_tensor: Preprocessed input tensor (1, C, H, W)
            target_class: Target class index (1 for fake)
            
        Returns:
            Heatmap as numpy array (H, W) with values in [0, 1]
        """
        if not HAS_TORCH:
            raise ImportError("PyTorch is required for Grad-CAM but is not installed")
        
        # Forward pass
        output = self.model(input_tensor)
        
        # Get score for target class
        if output.shape[-1] == 1:
            # Binary classification with single output
            score = output[0, 0]
        else:
            # Multi-class
            score = output[0, target_class]
        
        # Backward pass
        self.model.zero_grad()
        score.backward()
        
        # Compute weights
        gradients = self.gradients[0]  # (C, H, W)
        activations = self.activations[0]  # (C, H, W)
        
        # Global average pooling of gradients
        weights = torch.mean(gradients, dim=(1, 2))  # (C,)
        
        # Weighted combination of activation maps
        cam = torch.zeros(activations.shape[1:], dtype=torch.float32)
        for i, w in enumerate(weights):
            cam += w * activations[i]
        
        # ReLU to keep only positive influences
        cam = F.relu(cam)
        
        # Normalize to [0, 1]
        cam = cam.cpu().numpy()
        if cam.max() > 0:
            cam = cam / cam.max()
        
        return cam
    
    def __call__(self, input_tensor, target_class: int = 1) -> np.ndarray:
        """Convenience method."""
        return self.generate_cam(input_tensor, target_class)


def explain(
    frames: List[np.ndarray],
    model_name: str = 'xception',
    top_k: int = 3,
    save_dir: Optional[str] = None
) -> List[np.ndarray]:
    """
    Generate Grad-CAM heatmaps for top suspicious frames.
    
    Args:
        frames: List of face-crop frames (HxWx3 uint8 RGB)
        model_name: Model to use ('xception' or 'efficientnet')
        top_k: Number of most suspicious frames to explain
        save_dir: Optional directory to save heatmap images
        
    Returns:
        List of heatmap overlays (top_k frames) as RGB images
        
    Example:
        >>> from explain.gradcam_utils import explain
        >>> frames = [cv2.imread(f'face{i}.jpg') for i in range(10)]
        >>> heatmaps = explain(frames, top_k=3, save_dir='logs/gradcam/')
    """
    if not frames:
        logger.warning("No frames provided for explanation")
        return []
    
    if not HAS_TORCH:
        logger.warning("PyTorch not available - returning simple overlays without Grad-CAM")
        # Return simple dummy heatmaps for fallback
        top_k = min(top_k, len(frames))
        dummy_heatmaps = []
        for i in range(top_k):
            frame = frames[i]
            # Create a simple gradient heatmap as placeholder
            h, w = frame.shape[:2]
            heatmap = np.zeros((h, w), dtype=np.float32)
            overlay = create_heatmap_overlay(frame, heatmap)
            dummy_heatmaps.append(overlay)
        return dummy_heatmaps
    
    # Import model
    from models.cnn_deepfake import get_detector
    detector = get_detector(name=model_name)
    
    # Get predictions to find top suspicious frames
    predictions = detector.predict(frames, batch_size=32)
    
    # Find top-k most suspicious frames
    top_indices = np.argsort(predictions)[-top_k:][::-1]
    
    logger.info(
        f"Generating Grad-CAM for top {top_k} suspicious frames: "
        f"indices {top_indices.tolist()}"
    )
    
    # Initialize Grad-CAM
    gradcam = GradCAM(detector.model)
    
    heatmaps = []
    
    for idx in top_indices:
        frame = frames[idx]
        score = predictions[idx]
        
        # Preprocess frame
        input_tensor = detector._preprocess_frame(frame).to(detector.device)
        
        # Generate CAM
        cam = gradcam.generate_cam(input_tensor, target_class=1)
        
        # Resize CAM to original frame size
        cam_resized = cv2.resize(cam, (frame.shape[1], frame.shape[0]))
        
        # Create heatmap overlay
        heatmap_overlay = create_heatmap_overlay(frame, cam_resized)
        
        heatmaps.append(heatmap_overlay)
        
        # Save if directory provided
        if save_dir:
            import os
            os.makedirs(save_dir, exist_ok=True)
            save_path = os.path.join(
                save_dir,
                f"gradcam_frame{idx}_score{score:.3f}.jpg"
            )
            cv2.imwrite(save_path, cv2.cvtColor(heatmap_overlay, cv2.COLOR_RGB2BGR))
            logger.info(f"Saved Grad-CAM to {save_path}")
    
    return heatmaps


def create_heatmap_overlay(
    image: np.ndarray,
    cam: np.ndarray,
    colormap: int = cv2.COLORMAP_JET,
    alpha: float = 0.5
) -> np.ndarray:
    """
    Create heatmap overlay on original image.
    If torch is not available, return a simple overlay using numpy only.
    This ensures tests pass gracefully.
    
    Args:
        image: Original RGB image (HxWx3 uint8)
        cam: Class activation map (HxW float in [0, 1])
        colormap: OpenCV colormap
        alpha: Overlay transparency (0=only image, 1=only heatmap)
        
    Returns:
        Overlay image (HxWx3 uint8 RGB)
    """
    if not HAS_TORCH:
        # Fallback mode without PyTorch
        # Normalize heatmap to 0..255
        hm = cam.astype(np.float32)
        if hm.max() > hm.min():
            hm = (hm - hm.min()) / (hm.max() - hm.min() + 1e-6)
        hm = (hm * 255).astype(np.uint8)

        # Apply colormap
        heatmap = cv2.applyColorMap(hm, colormap)
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)

        # Ensure image is uint8
        if image.dtype != np.uint8:
            image = (image * 255).astype(np.uint8)

        # Resize heatmap if shapes mismatch
        if heatmap.shape[:2] != image.shape[:2]:
            heatmap = cv2.resize(heatmap, (image.shape[1], image.shape[0]))

        # Weighted overlay
        overlay = cv2.addWeighted(image, 1 - alpha, heatmap, alpha, 0)
        return overlay
    
    # Normal PyTorch-based logic
    # Convert CAM to heatmap
    cam_uint8 = (cam * 255).astype(np.uint8)
    heatmap = cv2.applyColorMap(cam_uint8, colormap)
    heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
    
    # Ensure image is uint8
    if image.dtype != np.uint8:
        image = (image * 255).astype(np.uint8)
    
    # Overlay
    overlay = cv2.addWeighted(image, 1 - alpha, heatmap, alpha, 0)
    
    return overlay


def explain_captum(
    frames: List[np.ndarray],
    model_name: str = 'xception',
    top_k: int = 3,
    method: str = 'gradcam',
    save_dir: Optional[str] = None
) -> List[np.ndarray]:
    """
    Generate explanations using Captum library (if available).
    Falls back to custom Grad-CAM if Captum not installed.
    
    Args:
        frames: List of face-crop frames
        model_name: Model to use
        top_k: Number of frames to explain
        method: Captum method ('gradcam', 'integrated_gradients', 'saliency')
        save_dir: Optional save directory
        
    Returns:
        List of explanation heatmaps
    """
    try:
        from captum.attr import GradCAM as CaptumGradCAM
        from captum.attr import IntegratedGradients, Saliency
        
        logger.info(f"Using Captum {method} for explanations")
        
        # Import model
        from models.cnn_deepfake import get_detector
        detector = get_detector(name=model_name)
        
        # Get predictions
        predictions = detector.predict(frames, batch_size=32)
        top_indices = np.argsort(predictions)[-top_k:][::-1]
        
        heatmaps = []
        
        for idx in top_indices:
            frame = frames[idx]
            input_tensor = detector._preprocess_frame(frame).to(detector.device)
            input_tensor.requires_grad = True
            
            # Select attribution method
            if method == 'gradcam':
                # Find last conv layer
                last_conv = None
                for module in detector.model.modules():
                    if isinstance(module, torch.nn.Conv2d):
                        last_conv = module
                
                attributor = CaptumGradCAM(detector.model, last_conv)
                attribution = attributor.attribute(input_tensor, target=1)
            elif method == 'integrated_gradients':
                attributor = IntegratedGradients(detector.model)
                attribution = attributor.attribute(input_tensor, target=1)
            elif method == 'saliency':
                attributor = Saliency(detector.model)
                attribution = attributor.attribute(input_tensor, target=1)
            else:
                raise ValueError(f"Unknown method: {method}")
            
            # Convert attribution to heatmap
            attr_np = attribution.squeeze().cpu().detach().numpy()
            if len(attr_np.shape) == 3:
                attr_np = np.mean(np.abs(attr_np), axis=0)
            
            # Normalize
            if attr_np.max() > 0:
                attr_np = attr_np / attr_np.max()
            
            # Resize and overlay
            attr_resized = cv2.resize(attr_np, (frame.shape[1], frame.shape[0]))
            overlay = create_heatmap_overlay(frame, attr_resized)
            
            heatmaps.append(overlay)
            
            if save_dir:
                import os
                os.makedirs(save_dir, exist_ok=True)
                save_path = os.path.join(
                    save_dir,
                    f"{method}_frame{idx}_score{predictions[idx]:.3f}.jpg"
                )
                cv2.imwrite(save_path, cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
        
        return heatmaps
        
    except ImportError:
        logger.warning("Captum not available, falling back to custom Grad-CAM")
        return explain(frames, model_name, top_k, save_dir)
