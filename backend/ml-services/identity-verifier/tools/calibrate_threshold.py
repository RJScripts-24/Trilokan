#!/usr/bin/env python3
"""
Threshold Calibration Tool for CNN Deepfake Detection

This script performs ROC curve analysis on a validation dataset to determine
optimal thresholds for different target false positive rates (FPRs).

Usage:
    python tools/calibrate_threshold.py --data-dir data/validation --output thresholds.json
    python tools/calibrate_threshold.py --data-dir data/validation --target-fpr 0.01 0.05 0.10
    python tools/calibrate_threshold.py --data-dir data/validation --model efficientnet --plot
"""

import argparse
import os
import sys
import json
import logging
from pathlib import Path
from typing import List, Dict, Tuple
import numpy as np

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from sklearn.metrics import roc_curve, roc_auc_score, precision_recall_curve
    from sklearn.metrics import confusion_matrix, classification_report
    SKLEARN_AVAILABLE = True
except ImportError:
    print("Warning: scikit-learn not available. Install with: pip install scikit-learn")
    SKLEARN_AVAILABLE = False

try:
    import matplotlib.pyplot as plt
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    print("Warning: matplotlib not available. Install with: pip install matplotlib")
    MATPLOTLIB_AVAILABLE = False

try:
    from inference.deepfake_inference import run_deepfake_model
    from ingest.frame_utils import extract_frames
    INFERENCE_AVAILABLE = True
except ImportError:
    print("Warning: Inference modules not available")
    INFERENCE_AVAILABLE = False

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def load_validation_data(data_dir: str, model_name: str = 'xception') -> Tuple[np.ndarray, np.ndarray]:
    """
    Load validation data and run inference to get predictions.
    
    Expected directory structure:
        data_dir/
            real/
                video1.mp4
                video2.mp4
                ...
            fake/
                video1.mp4
                video2.mp4
                ...
    
    Args:
        data_dir: Path to validation dataset
        model_name: CNN model to use for inference
    
    Returns:
        (y_true, y_scores): Ground truth labels and predicted scores
    """
    if not INFERENCE_AVAILABLE:
        logger.error("Inference modules not available")
        return None, None
    
    real_dir = os.path.join(data_dir, 'real')
    fake_dir = os.path.join(data_dir, 'fake')
    
    if not os.path.exists(real_dir) or not os.path.exists(fake_dir):
        logger.error(f"Expected directories not found: {real_dir}, {fake_dir}")
        return None, None
    
    y_true = []
    y_scores = []
    
    # Process real videos (label=0)
    logger.info(f"Processing real videos from {real_dir}...")
    real_videos = [f for f in os.listdir(real_dir) if f.endswith(('.mp4', '.avi', '.mov'))]
    for video_file in real_videos:
        video_path = os.path.join(real_dir, video_file)
        try:
            frames = extract_frames(video_path, max_frames=50, frame_skip=5)
            if frames:
                scores = run_deepfake_model(frames, model_name=model_name, batch_size=16)
                avg_score = float(np.mean(scores))
                y_true.append(0)  # Real
                y_scores.append(avg_score)
                logger.info(f"  {video_file}: score={avg_score:.4f}")
        except Exception as e:
            logger.warning(f"  Failed to process {video_file}: {e}")
    
    # Process fake videos (label=1)
    logger.info(f"Processing fake videos from {fake_dir}...")
    fake_videos = [f for f in os.listdir(fake_dir) if f.endswith(('.mp4', '.avi', '.mov'))]
    for video_file in fake_videos:
        video_path = os.path.join(fake_dir, video_file)
        try:
            frames = extract_frames(video_path, max_frames=50, frame_skip=5)
            if frames:
                scores = run_deepfake_model(frames, model_name=model_name, batch_size=16)
                avg_score = float(np.mean(scores))
                y_true.append(1)  # Fake
                y_scores.append(avg_score)
                logger.info(f"  {video_file}: score={avg_score:.4f}")
        except Exception as e:
            logger.warning(f"  Failed to process {video_file}: {e}")
    
    logger.info(f"\nProcessed {len(y_true)} videos ({len(real_videos)} real, {len(fake_videos)} fake)")
    
    return np.array(y_true), np.array(y_scores)


def calibrate_thresholds(y_true: np.ndarray, y_scores: np.ndarray, 
                        target_fprs: List[float] = [0.01, 0.05, 0.10]) -> Dict:
    """
    Perform ROC analysis and find thresholds for target FPRs.
    
    Args:
        y_true: Ground truth labels (0=real, 1=fake)
        y_scores: Predicted fake probabilities
        target_fprs: Target false positive rates
    
    Returns:
        dict: Calibration results with thresholds and metrics
    """
    if not SKLEARN_AVAILABLE:
        logger.error("scikit-learn not available")
        return None
    
    # Compute ROC curve
    fpr, tpr, thresholds = roc_curve(y_true, y_scores)
    roc_auc = roc_auc_score(y_true, y_scores)
    
    logger.info(f"\nROC AUC Score: {roc_auc:.4f}")
    
    # Find thresholds for target FPRs
    results = {
        'roc_auc': float(roc_auc),
        'thresholds': {}
    }
    
    logger.info("\nCalibrated Thresholds:")
    logger.info("-" * 60)
    
    for target_fpr in target_fprs:
        # Find threshold closest to target FPR
        idx = np.argmin(np.abs(fpr - target_fpr))
        threshold = thresholds[idx]
        actual_fpr = fpr[idx]
        actual_tpr = tpr[idx]
        
        # Compute metrics at this threshold
        y_pred = (y_scores >= threshold).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        results['thresholds'][f'fpr_{target_fpr:.2f}'] = {
            'threshold': float(threshold),
            'fpr': float(actual_fpr),
            'tpr': float(actual_tpr),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'tp': int(tp),
            'fp': int(fp),
            'tn': int(tn),
            'fn': int(fn)
        }
        
        logger.info(f"Target FPR: {target_fpr:.2%}")
        logger.info(f"  Threshold: {threshold:.4f}")
        logger.info(f"  Actual FPR: {actual_fpr:.4f}")
        logger.info(f"  TPR (Recall): {actual_tpr:.4f}")
        logger.info(f"  Precision: {precision:.4f}")
        logger.info(f"  F1 Score: {f1:.4f}")
        logger.info(f"  Confusion Matrix: TP={tp}, FP={fp}, TN={tn}, FN={fn}")
        logger.info("")
    
    # Add default threshold (Youden's J statistic - maximizes TPR - FPR)
    j_scores = tpr - fpr
    optimal_idx = np.argmax(j_scores)
    optimal_threshold = thresholds[optimal_idx]
    
    y_pred = (y_scores >= optimal_threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    
    results['thresholds']['default'] = {
        'threshold': float(optimal_threshold),
        'fpr': float(fpr[optimal_idx]),
        'tpr': float(tpr[optimal_idx]),
        'precision': float(precision),
        'recall': float(recall),
        'f1_score': float(f1),
        'tp': int(tp),
        'fp': int(fp),
        'tn': int(tn),
        'fn': int(fn),
        'note': 'Optimal threshold using Youden\'s J statistic'
    }
    
    logger.info("Recommended Default Threshold (Youden's J):")
    logger.info(f"  Threshold: {optimal_threshold:.4f}")
    logger.info(f"  FPR: {fpr[optimal_idx]:.4f}")
    logger.info(f"  TPR: {tpr[optimal_idx]:.4f}")
    logger.info(f"  Precision: {precision:.4f}")
    logger.info(f"  F1 Score: {f1:.4f}")
    logger.info("")
    
    # Store full ROC curve
    results['roc_curve'] = {
        'fpr': fpr.tolist(),
        'tpr': tpr.tolist(),
        'thresholds': thresholds.tolist()
    }
    
    return results


def plot_roc_curve(results: Dict, output_path: str):
    """Plot and save ROC curve."""
    if not MATPLOTLIB_AVAILABLE:
        logger.warning("matplotlib not available, cannot plot ROC curve")
        return
    
    fpr = np.array(results['roc_curve']['fpr'])
    tpr = np.array(results['roc_curve']['tpr'])
    roc_auc = results['roc_auc']
    
    plt.figure(figsize=(10, 8))
    plt.plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC curve (AUC = {roc_auc:.4f})')
    plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--', label='Random classifier')
    
    # Mark calibrated thresholds
    for key, data in results['thresholds'].items():
        if key != 'default':
            plt.plot(data['fpr'], data['tpr'], 'ro', markersize=8)
            plt.annotate(f"{key}\n(t={data['threshold']:.3f})",
                        xy=(data['fpr'], data['tpr']),
                        xytext=(10, -10), textcoords='offset points',
                        fontsize=8, ha='left')
    
    # Mark default threshold
    default = results['thresholds']['default']
    plt.plot(default['fpr'], default['tpr'], 'go', markersize=10, label='Default (Youden)')
    
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate', fontsize=12)
    plt.ylabel('True Positive Rate', fontsize=12)
    plt.title('ROC Curve - CNN Deepfake Detection', fontsize=14)
    plt.legend(loc="lower right", fontsize=10)
    plt.grid(alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=300)
    logger.info(f"✓ ROC curve saved to: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description='Calibrate thresholds for CNN deepfake detection',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        '--data-dir',
        type=str,
        required=True,
        help='Path to validation dataset (must contain real/ and fake/ subdirectories)'
    )
    
    parser.add_argument(
        '--model',
        type=str,
        default='xception',
        choices=['xception', 'efficientnet'],
        help='CNN model to use (default: xception)'
    )
    
    parser.add_argument(
        '--target-fpr',
        type=float,
        nargs='+',
        default=[0.01, 0.05, 0.10],
        help='Target false positive rates (default: 0.01 0.05 0.10)'
    )
    
    parser.add_argument(
        '--output',
        type=str,
        default='thresholds.json',
        help='Output JSON file for calibrated thresholds (default: thresholds.json)'
    )
    
    parser.add_argument(
        '--plot',
        action='store_true',
        help='Generate ROC curve plot'
    )
    
    args = parser.parse_args()
    
    # Load validation data
    logger.info("Loading validation data and running inference...")
    y_true, y_scores = load_validation_data(args.data_dir, args.model)
    
    if y_true is None or len(y_true) == 0:
        logger.error("Failed to load validation data")
        sys.exit(1)
    
    # Calibrate thresholds
    logger.info("\nCalibrating thresholds...")
    results = calibrate_thresholds(y_true, y_scores, args.target_fpr)
    
    if results is None:
        logger.error("Calibration failed")
        sys.exit(1)
    
    # Save results
    with open(args.output, 'w') as f:
        json.dump(results, f, indent=2)
    logger.info(f"\n✓ Calibrated thresholds saved to: {args.output}")
    
    # Plot ROC curve
    if args.plot:
        plot_path = args.output.replace('.json', '_roc.png')
        plot_roc_curve(results, plot_path)
    
    logger.info("\n✓ Calibration complete")


if __name__ == '__main__':
    main()
