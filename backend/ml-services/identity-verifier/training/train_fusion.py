import os
import pickle
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score
from training.utils import setup_logger, save_pickle

logger = setup_logger("train_fusion")

def train_fusion_model(features_csv: str, labels_csv: str = None, output_model_path: str = "models/weights/fusion_model.pkl"):
    """
    Trains a classifier on the extracted feature vectors.
    Note: labels_csv is deprecated - labels are expected to be in features_csv.
    
    Returns:
        str: Path to saved model artifact on success
        None: When no features/labels are available for training
    """
    # Handle None or missing CSV paths gracefully
    if features_csv is None:
        logger.warning("Features CSV is None — no features extracted. Returning None for model_artifact.")
        return None
    
    if not os.path.exists(features_csv):
        logger.warning(f"Features CSV file not found: {features_csv}. Returning None for model_artifact.")
        return None

    df = pd.read_csv(features_csv)
    
    # Select feature columns (exclude metadata like video_id)
    # Ensure these match the keys in pipeline/stage2.py
    feature_cols = [
        'cnn_score', 'rppg_conf', 'jitter_score', 
        'flow_variance', 'lip_sync_score', 'audio_spoof_score'
    ]
    
    # Handle missing values (some features might be missing for some videos)
    df = df.fillna(0)
    
    # Filter only columns that exist in the CSV
    valid_cols = [c for c in feature_cols if c in df.columns]
    
    X = df[valid_cols]
    y = df['label']
    
    logger.info(f"Training on {len(X)} samples with features: {valid_cols}")
    
    # Split
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train Model
    # Logistic Regression is good for interpretability (coefficients = weights)
    # RandomForest/XGBoost is better for non-linear relationships
    model = LogisticRegression(class_weight='balanced')
    model.fit(X_train, y_train)
    
    # Evaluate
    preds = model.predict(X_val)
    probs = model.predict_proba(X_val)[:, 1]
    
    logger.info("Classification Report:")
    logger.info("\n" + classification_report(y_val, preds))
    logger.info(f"ROC-AUC Score: {roc_auc_score(y_val, probs):.4f}")
    
    if hasattr(model, 'coef_'):
        logger.info("Learned Weights:")
        for feat, coef in zip(valid_cols, model.coef_[0]):
            logger.info(f"  {feat}: {coef:.4f}")

    # Save
    save_pickle(model, output_model_path)
    logger.info(f"Model saved to {output_model_path}")
    return output_model_path

# Alias for compatibility with tests
train = train_fusion_model

if __name__ == "__main__":
    train_fusion_model(
        "data/feature_csvs/train_features.csv", 
        "models/weights/fusion_model.pkl"
    )