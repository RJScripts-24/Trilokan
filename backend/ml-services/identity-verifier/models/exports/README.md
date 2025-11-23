# Model Checkpoints

This directory contains trained model checkpoints for CNN-based deepfake detection.

## Required Checkpoints

### Xception (Primary Model)
- **Filename**: `xception_ffpp.pth`
- **Description**: Xception model fine-tuned on FaceForensics++ dataset
- **Input Size**: 299×299 RGB
- **Architecture**: Modified Xception with binary classification head
- **Expected Performance**: 
  - Frame-level AUC: ~0.95
  - Video-level AUC: ~0.98

### EfficientNet-B0 (Lightweight Alternative)
- **Filename**: `efficientnet_b0_df.pth`
- **Description**: EfficientNet-B0 for real-time inference
- **Input Size**: 224×224 RGB
- **Architecture**: EfficientNet-B0 with binary classification head
- **Expected Performance**:
  - Frame-level AUC: ~0.92
  - Video-level AUC: ~0.96
  - Faster inference than Xception

## How to Obtain Checkpoints

### Option 1: Pre-trained Weights (Recommended for Demo)

Download pre-trained weights from:
1. **FaceForensics++ baseline models**: https://github.com/ondyari/FaceForensics
2. **Xception PyTorch**: Convert from Keras or use timm pretrained
3. **Contact**: Request checkpoints from project maintainers

Place downloaded `.pth` files in this directory.

### Option 2: Train Your Own

1. **Prepare dataset**:
   ```bash
   # Download FaceForensics++ dataset
   # Place in data/datasets/faceforensics/
   # Structure:
   #   data/datasets/faceforensics/
   #     real/
   #       video_0/
   #         frame_000.jpg
   #         ...
   #     fake/
   #       DeepFakes/
   #       FaceSwap/
   #       Face2Face/
   #       NeuralTextures/
   ```

2. **Train model**:
   ```bash
   python training/train_cnn_df.py \
     --data_dir data/datasets/faceforensics \
     --model xception \
     --epochs 20 \
     --batch_size 32 \
     --lr 1e-4 \
     --save_dir models/exports
   ```

3. **Checkpoint will be saved as**: `models/exports/xception_ffpp.pth`

## Checkpoint Format

Checkpoints are saved as PyTorch state dictionaries with the following structure:

```python
{
    'epoch': int,
    'model_state_dict': OrderedDict,
    'optimizer_state_dict': OrderedDict,  # optional
    'val_auc': float,  # optional
}
```

## Running Inference Without Checkpoints

The system will run with **random initialization** if checkpoints are not found. This is useful for:
- Testing the inference pipeline
- Development and debugging
- Verifying installation

**Warning**: Results will be meaningless without trained weights. For production use, you **must** obtain proper checkpoints.

## Quick Test

Run a quick test to verify setup:

```bash
# Test with demo video (random initialization)
python integration/demo_run.py \
  --video data/datasets/demo/real.mp4 \
  --model xception \
  --output results/test/
```

## Model Registry Integration

Checkpoints are registered in `models/model_registry.py`. Update paths there if using custom checkpoint locations:

```python
# models/model_registry.py
MODEL_PATHS = {
    'xception': 'models/exports/xception_ffpp.pth',
    'efficientnet': 'models/exports/efficientnet_b0_df.pth',
}
```

## Troubleshooting

### "Checkpoint not found" warning
This is expected if you haven't downloaded/trained checkpoints yet. The model will initialize with random weights.

### CUDA out of memory
Reduce batch size in inference calls:
```python
predictions = detector.predict(frames, batch_size=8)  # instead of 32
```

### Slow CPU inference
Switch to EfficientNet for faster results:
```python
detector = get_detector(name='efficientnet')
```

## Security Note

Checkpoint files may be large (100-500 MB). Ensure you have sufficient disk space and verify checksums when downloading from external sources.

## License and Attribution

If using pre-trained weights from FaceForensics++ or other sources, please cite the original papers:

```bibtex
@inproceedings{rossler2019faceforensics++,
  title={FaceForensics++: Learning to detect manipulated facial images},
  author={R{\"o}ssler, Andreas and Cozzolino, Davide and Verdoliva, Luisa and Riess, Christian and Thies, Justus and Nie{\ss}ner, Matthias},
  booktitle={ICCV},
  year={2019}
}
```
