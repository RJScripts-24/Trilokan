import os
import cv2
import pandas as pd
import numpy as np
from tqdm import tqdm
from training.utils import setup_logger

# Import feature extraction logic
# We treat the pipeline stages as library functions here
try:
    from pipeline.stage1 import run_stage1
    from pipeline.stage2 import run_stage2
except ImportError:
    print("Pipeline modules not found. Ensure project root is in PYTHONPATH.")
    exit(1)

logger = setup_logger("feature_extraction")

def process_video(video_path: str, label: int):
    """
    Runs the verification pipeline on a single video file to extract signals.
    """
    try:
        cap = cv2.VideoCapture(video_path)
        frames = []
        frame_count = 0
        
        # Read frames (limit to first 150 frames ~ 5 seconds for speed)
        while cap.isOpened() and frame_count < 150:
            ret, frame = cap.read()
            if not ret:
                break
            frames.append(frame)
            frame_count += 1
        cap.release()

        if not frames:
            return None

        # Construct Capture Object
        capture_data = {
            'frames': frames,
            'audio': np.array([]), # Placeholder if no audio extraction logic here
            'metadata': {'user_id': 'training_sample'}
        }

        # Run Stage 1 (Quality Checks)
        s1_res = run_stage1(capture_data)
        if s1_res.get('fast_fail'):
            return None # Skip bad quality samples

        # Run Stage 2 (Heavy Features)
        # This returns dict like {'cnn_score': 0.9, 'rppg_conf': 0.1, ...}
        features = run_stage2(capture_data, s1_res)
        
        # Add label
        features['label'] = label # 0 = Real, 1 = Fake
        features['video_id'] = os.path.basename(video_path)
        
        return features

    except Exception as e:
        logger.error(f"Error processing {video_path}: {e}")
        return None

def run_on_dataset(dataset_root: str, output_csv: str):
    """
    Iterates through dataset folders 'real' and 'fake'.
    """
    data_points = []
    
    for category, label in [('real', 0), ('fake', 1)]:
        dir_path = os.path.join(dataset_root, category)
        if not os.path.exists(dir_path):
            logger.warning(f"Directory not found: {dir_path}")
            continue
            
        files = [f for f in os.listdir(dir_path) if f.endswith('.mp4')]
        logger.info(f"Processing {len(files)} {category} videos...")
        
        for f in tqdm(files):
            vid_path = os.path.join(dir_path, f)
            feats = process_video(vid_path, label)
            if feats:
                data_points.append(feats)

    # Save to CSV
    if data_points:
        df = pd.DataFrame(data_points)
        df.to_csv(output_csv, index=False)
        logger.info(f"Features saved to {output_csv} with {len(df)} samples.")
        return output_csv
    else:
        logger.error("No features extracted.")
        return None

if __name__ == "__main__":
    # Example usage
    # Ensure you have 'data/datasets/train/real' and 'data/datasets/train/fake'
    run_on_dataset("data/datasets/train", "data/feature_csvs/train_features.csv")