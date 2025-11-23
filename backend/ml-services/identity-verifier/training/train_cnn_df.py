"""
Training script for CNN-based deepfake detection.
Fine-tunes Xception or EfficientNet on FaceForensics++ dataset.

Expected dataset structure:
data/datasets/faceforensics/
    real/
        video_0/
            frame_000.jpg
            frame_001.jpg
            ...
        video_1/
            ...
    fake/
        DeepFakes/
            video_0/
                frame_000.jpg
                ...
        FaceSwap/
            ...
        Face2Face/
            ...
        NeuralTextures/
            ...

Usage:
    python training/train_cnn_df.py --data_dir data/datasets/faceforensics --model xception --epochs 20
"""

import argparse
import logging
import os
from pathlib import Path
from typing import Tuple, Dict, Any
import numpy as np

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
from sklearn.metrics import roc_auc_score, accuracy_score
from tqdm import tqdm

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DeepfakeDataset(Dataset):
    """
    Frame-level deepfake dataset loader.
    """
    
    def __init__(
        self,
        data_dir: str,
        split: str = 'train',
        transform=None,
        balance: bool = True
    ):
        """
        Args:
            data_dir: Root directory containing real/ and fake/ subdirs
            split: 'train', 'val', or 'test'
            transform: Torchvision transforms
            balance: Whether to balance real/fake samples
        """
        self.data_dir = Path(data_dir)
        self.transform = transform
        self.samples = []
        
        # Load samples
        self._load_samples(split)
        
        if balance:
            self._balance_classes()
        
        logger.info(
            f"Loaded {len(self.samples)} {split} samples "
            f"({sum(1 for _, l in self.samples if l == 0)} real, "
            f"{sum(1 for _, l in self.samples if l == 1)} fake)"
        )
    
    def _load_samples(self, split: str):
        """Load file paths and labels."""
        # Load real samples
        real_dir = self.data_dir / 'real'
        if real_dir.exists():
            for video_dir in real_dir.iterdir():
                if not video_dir.is_dir():
                    continue
                for img_path in video_dir.glob('*.jpg'):
                    self.samples.append((str(img_path), 0))  # 0 = real
        
        # Load fake samples
        fake_dir = self.data_dir / 'fake'
        if fake_dir.exists():
            for manipulation_dir in fake_dir.iterdir():
                if not manipulation_dir.is_dir():
                    continue
                for video_dir in manipulation_dir.iterdir():
                    if not video_dir.is_dir():
                        continue
                    for img_path in video_dir.glob('*.jpg'):
                        self.samples.append((str(img_path), 1))  # 1 = fake
    
    def _balance_classes(self):
        """Balance real and fake samples."""
        real_samples = [(p, l) for p, l in self.samples if l == 0]
        fake_samples = [(p, l) for p, l in self.samples if l == 1]
        
        min_count = min(len(real_samples), len(fake_samples))
        
        # Randomly sample to balance
        if len(real_samples) > min_count:
            real_samples = np.random.choice(
                real_samples, min_count, replace=False
            ).tolist()
        if len(fake_samples) > min_count:
            fake_samples = np.random.choice(
                fake_samples, min_count, replace=False
            ).tolist()
        
        self.samples = real_samples + fake_samples
        np.random.shuffle(self.samples)
    
    def __len__(self):
        return len(self.samples)
    
    def __getitem__(self, idx):
        img_path, label = self.samples[idx]
        
        # Load image
        image = Image.open(img_path).convert('RGB')
        
        # Apply transforms
        if self.transform:
            image = self.transform(image)
        
        return image, label


class VideoAggregator:
    """
    Aggregates frame-level predictions to video-level for evaluation.
    """
    
    def __init__(self):
        self.video_predictions = {}
    
    def add_prediction(self, video_id: str, prediction: float, label: int):
        """Add frame prediction."""
        if video_id not in self.video_predictions:
            self.video_predictions[video_id] = {'preds': [], 'label': label}
        self.video_predictions[video_id]['preds'].append(prediction)
    
    def compute_video_auc(self):
        """Compute video-level AUC."""
        video_labels = []
        video_scores = []
        
        for video_id, data in self.video_predictions.items():
            video_labels.append(data['label'])
            # Use mean aggregation
            video_scores.append(np.mean(data['preds']))
        
        if len(set(video_labels)) < 2:
            logger.warning("Only one class present in predictions")
            return 0.5
        
        return roc_auc_score(video_labels, video_scores)


class EarlyStopping:
    """Early stopping handler."""
    
    def __init__(self, patience: int = 5, min_delta: float = 0.001):
        self.patience = patience
        self.min_delta = min_delta
        self.best_score = None
        self.counter = 0
        self.early_stop = False
    
    def __call__(self, score: float):
        if self.best_score is None:
            self.best_score = score
        elif score < self.best_score + self.min_delta:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True
        else:
            self.best_score = score
            self.counter = 0


def train_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    optimizer: optim.Optimizer,
    device: torch.device
) -> Dict[str, float]:
    """Train for one epoch."""
    model.train()
    
    running_loss = 0.0
    all_preds = []
    all_labels = []
    
    pbar = tqdm(dataloader, desc='Training')
    for images, labels in pbar:
        images = images.to(device)
        labels = labels.float().to(device)
        
        # Forward
        optimizer.zero_grad()
        outputs = model(images).squeeze()
        loss = criterion(outputs, labels)
        
        # Backward
        loss.backward()
        optimizer.step()
        
        # Metrics
        running_loss += loss.item()
        preds = torch.sigmoid(outputs).detach().cpu().numpy()
        all_preds.extend(preds.tolist())
        all_labels.extend(labels.cpu().numpy().tolist())
        
        pbar.set_postfix({'loss': loss.item()})
    
    # Compute metrics
    avg_loss = running_loss / len(dataloader)
    auc = roc_auc_score(all_labels, all_preds)
    acc = accuracy_score(all_labels, np.array(all_preds) > 0.5)
    
    return {'loss': avg_loss, 'auc': auc, 'acc': acc}


def validate(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: torch.device
) -> Dict[str, float]:
    """Validate model."""
    model.eval()
    
    running_loss = 0.0
    all_preds = []
    all_labels = []
    
    with torch.no_grad():
        for images, labels in tqdm(dataloader, desc='Validation'):
            images = images.to(device)
            labels = labels.float().to(device)
            
            outputs = model(images).squeeze()
            loss = criterion(outputs, labels)
            
            running_loss += loss.item()
            preds = torch.sigmoid(outputs).cpu().numpy()
            all_preds.extend(preds.tolist())
            all_labels.extend(labels.cpu().numpy().tolist())
    
    avg_loss = running_loss / len(dataloader)
    auc = roc_auc_score(all_labels, all_preds)
    acc = accuracy_score(all_labels, np.array(all_preds) > 0.5)
    
    return {'loss': avg_loss, 'auc': auc, 'acc': acc}


def main():
    parser = argparse.ArgumentParser(description='Train CNN deepfake detector')
    parser.add_argument('--data_dir', type=str, required=True,
                        help='Path to FaceForensics++ dataset')
    parser.add_argument('--model', type=str, default='xception',
                        choices=['xception', 'efficientnet'],
                        help='Model architecture')
    parser.add_argument('--epochs', type=int, default=20,
                        help='Number of training epochs')
    parser.add_argument('--batch_size', type=int, default=32,
                        help='Batch size')
    parser.add_argument('--lr', type=float, default=1e-4,
                        help='Learning rate')
    parser.add_argument('--weight_decay', type=float, default=1e-5,
                        help='Weight decay')
    parser.add_argument('--save_dir', type=str, default='models/exports',
                        help='Directory to save checkpoints')
    parser.add_argument('--patience', type=int, default=5,
                        help='Early stopping patience')
    
    args = parser.parse_args()
    
    # Device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"Using device: {device}")
    
    # Transforms
    if args.model == 'xception':
        input_size = 299
    else:
        input_size = 224
    
    train_transform = transforms.Compose([
        transforms.Resize((input_size, input_size)),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                           std=[0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((input_size, input_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                           std=[0.229, 0.224, 0.225])
    ])
    
    # Datasets
    train_dataset = DeepfakeDataset(
        args.data_dir, split='train', transform=train_transform, balance=True
    )
    val_dataset = DeepfakeDataset(
        args.data_dir, split='val', transform=val_transform, balance=False
    )
    
    # DataLoaders
    train_loader = DataLoader(
        train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=4
    )
    val_loader = DataLoader(
        val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=4
    )
    
    # Model
    if args.model == 'xception':
        from models.xception_wrapper import XceptionWrapper
        # Create temporary checkpoint path (will be untrained initially)
        temp_ckpt = os.path.join(args.save_dir, 'temp_init.pth')
        os.makedirs(args.save_dir, exist_ok=True)
        wrapper = XceptionWrapper(temp_ckpt, device=str(device))
        model = wrapper.model
    else:
        from models.efficientnet_wrapper import EfficientNetWrapper
        temp_ckpt = os.path.join(args.save_dir, 'temp_init.pth')
        os.makedirs(args.save_dir, exist_ok=True)
        wrapper = EfficientNetWrapper(temp_ckpt, device=str(device))
        model = wrapper.model
    
    model = model.to(device)
    
    # Loss and optimizer
    criterion = nn.BCEWithLogitsLoss()
    optimizer = optim.AdamW(
        model.parameters(), lr=args.lr, weight_decay=args.weight_decay
    )
    
    # Early stopping
    early_stopping = EarlyStopping(patience=args.patience)
    
    # Training loop
    best_val_auc = 0.0
    
    for epoch in range(args.epochs):
        logger.info(f"\nEpoch {epoch + 1}/{args.epochs}")
        
        # Train
        train_metrics = train_epoch(model, train_loader, criterion, optimizer, device)
        logger.info(
            f"Train - Loss: {train_metrics['loss']:.4f}, "
            f"AUC: {train_metrics['auc']:.4f}, "
            f"Acc: {train_metrics['acc']:.4f}"
        )
        
        # Validate
        val_metrics = validate(model, val_loader, criterion, device)
        logger.info(
            f"Val   - Loss: {val_metrics['loss']:.4f}, "
            f"AUC: {val_metrics['auc']:.4f}, "
            f"Acc: {val_metrics['acc']:.4f}"
        )
        
        # Save best model
        if val_metrics['auc'] > best_val_auc:
            best_val_auc = val_metrics['auc']
            save_path = os.path.join(
                args.save_dir,
                f"{args.model}_ffpp.pth"
            )
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_auc': val_metrics['auc'],
            }, save_path)
            logger.info(f"Saved best model to {save_path}")
        
        # Early stopping
        early_stopping(val_metrics['auc'])
        if early_stopping.early_stop:
            logger.info("Early stopping triggered")
            break
    
    logger.info(f"\nTraining complete. Best val AUC: {best_val_auc:.4f}")


if __name__ == '__main__':
    main()
