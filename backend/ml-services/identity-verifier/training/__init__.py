"""
Training Package
----------------
This package manages the offline Machine Learning lifecycle for TrustGuard.

It includes pipelines for:
1. Feature Extraction: Converting raw video datasets into numerical CSVs.
2. Fusion Training: Learning the optimal weights for combining fraud signals.
3. Calibration: Calculating statistical baselines (Z-scores) from real faces.
4. Model Training: Fine-tuning deep neural networks (CNNs) for artifact detection.

Usage:
    from training import train_fusion_model, calibrate_stats
    
    # 1. Train the decision engine
    train_fusion_model("data/train.csv", "models/fusion.pkl")
    
    # 2. Update baselines
    calibrate_stats("data/train.csv", "data/calibration")
"""

from .extract_features import run_on_dataset, process_video
from .train_fusion import train_fusion_model
from .calibrate import calibrate_stats
from .train_cnn import train_cnn
from .utils import setup_logger

__all__ = [
    "run_on_dataset",
    "process_video",
    "train_fusion_model",
    "calibrate_stats",
    "train_cnn",
    "setup_logger"
]