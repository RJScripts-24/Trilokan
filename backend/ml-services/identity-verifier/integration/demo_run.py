"""
Demo script for CNN deepfake detection.
Runs complete pipeline: face detection → deepfake inference → results + Grad-CAM.

Usage:
    python integration/demo_run.py --video path/to/video.mp4
    python integration/demo_run.py --video path/to/video.mp4 --model efficientnet --output results/
"""

import argparse
import os
import sys
import csv
import logging
from pathlib import Path
from typing import List, Tuple, Optional
import cv2
import numpy as np

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from inference.deepfake_inference import run_deepfake_model, aggregate_scores
from explain.gradcam_utils import explain

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def extract_frames_from_video(video_path: str, max_frames: Optional[int] = None) -> List[np.ndarray]:
    """
    Extract frames from video file.
    
    Args:
        video_path: Path to video file
        max_frames: Maximum number of frames to extract (None = all)
        
    Returns:
        List of frames as BGR numpy arrays
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video not found: {video_path}")
    
    cap = cv2.VideoCapture(video_path)
    frames = []
    
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    logger.info(f"Video info: {total_frames} frames, {fps:.2f} FPS")
    
    frame_count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        frames.append(frame)
        frame_count += 1
        
        if max_frames and frame_count >= max_frames:
            break
    
    cap.release()
    logger.info(f"Extracted {len(frames)} frames from video")
    
    return frames


def detect_and_align_face(frame: np.ndarray, detector=None) -> Optional[np.ndarray]:
    """
    Detect and extract face from frame.
    
    Args:
        frame: BGR frame
        detector: Optional face detector (uses simple Haar cascade if None)
        
    Returns:
        Face crop (RGB) or None if no face detected
    """
    if detector is None:
        # Use simple Haar cascade detector
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(100, 100)
        )
        
        if len(faces) == 0:
            return None
        
        # Take largest face
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        
        # Add margin
        margin = int(0.2 * min(w, h))
        x1 = max(0, x - margin)
        y1 = max(0, y - margin)
        x2 = min(frame.shape[1], x + w + margin)
        y2 = min(frame.shape[0], y + h + margin)
        
        face = frame[y1:y2, x1:x2]
        
        # Convert to RGB
        face_rgb = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
        
        return face_rgb
    else:
        # Use custom detector
        return detector(frame)


def run_demo(
    video_path: str,
    model_name: str = 'xception',
    output_dir: str = 'results',
    frame_skip: int = 5,
    batch_size: int = 16,
    top_k_gradcam: int = 3,
    max_frames: Optional[int] = None
):
    """
    Run complete deepfake detection demo.
    
    Args:
        video_path: Path to input video
        model_name: Model to use ('xception' or 'efficientnet')
        output_dir: Directory to save results
        frame_skip: Process every Nth frame
        batch_size: Batch size for inference
        top_k_gradcam: Number of Grad-CAM heatmaps to generate
        max_frames: Maximum frames to process (None = all)
    """
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    video_name = Path(video_path).stem
    logger.info(f"\n{'='*60}")
    logger.info(f"Running deepfake detection demo on: {video_name}")
    logger.info(f"Model: {model_name}")
    logger.info(f"{'='*60}\n")
    
    # Step 1: Extract frames
    logger.info("Step 1: Extracting frames from video...")
    video_frames = extract_frames_from_video(video_path, max_frames)
    
    if not video_frames:
        logger.error("No frames extracted from video")
        return
    
    # Step 2: Detect faces
    logger.info("Step 2: Detecting faces...")
    face_crops = []
    face_frame_indices = []
    
    for idx, frame in enumerate(video_frames):
        if idx % frame_skip != 0:
            continue
        
        face = detect_and_align_face(frame)
        if face is not None:
            face_crops.append(face)
            face_frame_indices.append(idx)
    
    logger.info(f"Detected {len(face_crops)} faces from {len(video_frames)} frames")
    
    if not face_crops:
        logger.error("No faces detected in video")
        return
    
    # Step 3: Run deepfake detection
    logger.info("Step 3: Running deepfake detection...")
    frame_scores = run_deepfake_model(
        face_crops,
        model_name=model_name,
        batch_size=batch_size
    )
    
    # Step 4: Aggregate scores
    video_fake_prob = aggregate_scores(frame_scores, method='mean')
    video_fake_prob_max = aggregate_scores(frame_scores, method='max')
    video_fake_prob_p90 = aggregate_scores(frame_scores, method='percentile')
    
    logger.info(f"\n{'='*60}")
    logger.info("RESULTS:")
    logger.info(f"{'='*60}")
    logger.info(f"Frames processed: {len(face_crops)}")
    logger.info(f"Video fake probability (mean): {video_fake_prob:.4f}")
    logger.info(f"Video fake probability (max):  {video_fake_prob_max:.4f}")
    logger.info(f"Video fake probability (p90):  {video_fake_prob_p90:.4f}")
    
    # Classification
    threshold = 0.5
    is_fake = video_fake_prob >= threshold
    logger.info(f"\nClassification (threshold={threshold}): {'FAKE' if is_fake else 'REAL'}")
    logger.info(f"{'='*60}\n")
    
    # Step 5: Save per-frame scores to CSV
    csv_path = os.path.join(output_dir, f"{video_name}_frame_scores.csv")
    with open(csv_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['frame_index', 'fake_probability'])
        for idx, score in zip(face_frame_indices, frame_scores):
            writer.writerow([idx, f"{score:.6f}"])
    
    logger.info(f"Saved per-frame scores to: {csv_path}")
    
    # Step 6: Generate Grad-CAM heatmaps for top suspicious frames
    logger.info(f"Step 4: Generating Grad-CAM heatmaps for top {top_k_gradcam} suspicious frames...")
    gradcam_dir = os.path.join(output_dir, 'gradcam', video_name)
    
    try:
        heatmaps = explain(
            frames=face_crops,
            model_name=model_name,
            top_k=top_k_gradcam,
            save_dir=gradcam_dir
        )
        logger.info(f"Saved {len(heatmaps)} Grad-CAM heatmaps to: {gradcam_dir}")
    except Exception as e:
        logger.warning(f"Grad-CAM generation failed: {e}")
    
    # Step 7: Save summary report
    summary_path = os.path.join(output_dir, f"{video_name}_summary.txt")
    with open(summary_path, 'w') as f:
        f.write(f"Deepfake Detection Summary\n")
        f.write(f"{'='*60}\n\n")
        f.write(f"Video: {video_path}\n")
        f.write(f"Model: {model_name}\n")
        f.write(f"Total frames: {len(video_frames)}\n")
        f.write(f"Frames processed: {len(face_crops)}\n")
        f.write(f"Frame skip: {frame_skip}\n\n")
        f.write(f"Results:\n")
        f.write(f"  Video fake probability (mean): {video_fake_prob:.4f}\n")
        f.write(f"  Video fake probability (max):  {video_fake_prob_max:.4f}\n")
        f.write(f"  Video fake probability (p90):  {video_fake_prob_p90:.4f}\n\n")
        f.write(f"Classification (threshold={threshold}): {'FAKE' if is_fake else 'REAL'}\n\n")
        f.write(f"Top {min(5, len(frame_scores))} most suspicious frames:\n")
        
        # Show top suspicious frames
        top_indices = np.argsort(frame_scores)[-5:][::-1]
        for rank, idx in enumerate(top_indices, 1):
            f.write(f"  {rank}. Frame {face_frame_indices[idx]}: {frame_scores[idx]:.4f}\n")
    
    logger.info(f"Saved summary report to: {summary_path}")
    logger.info(f"\nDemo complete! Results saved to: {output_dir}\n")


def main():
    parser = argparse.ArgumentParser(
        description='Demo: CNN-based deepfake detection for video verification'
    )
    parser.add_argument(
        '--video',
        type=str,
        required=True,
        help='Path to input video file'
    )
    parser.add_argument(
        '--model',
        type=str,
        default='xception',
        choices=['xception', 'efficientnet'],
        help='Deepfake detection model to use'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='results',
        help='Output directory for results'
    )
    parser.add_argument(
        '--frame-skip',
        type=int,
        default=5,
        help='Process every Nth frame (default: 5)'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=16,
        help='Batch size for inference (default: 16)'
    )
    parser.add_argument(
        '--top-k',
        type=int,
        default=3,
        help='Number of Grad-CAM heatmaps to generate (default: 3)'
    )
    parser.add_argument(
        '--max-frames',
        type=int,
        default=None,
        help='Maximum frames to process (default: all)'
    )
    
    args = parser.parse_args()
    
    try:
        run_demo(
            video_path=args.video,
            model_name=args.model,
            output_dir=args.output,
            frame_skip=args.frame_skip,
            batch_size=args.batch_size,
            top_k_gradcam=args.top_k,
            max_frames=args.max_frames
        )
    except Exception as e:
        logger.error(f"Demo failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
