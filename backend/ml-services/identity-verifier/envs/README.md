# Conda Environments

This directory contains Conda environment specifications for the Identity Verifier service.

## Available Environments

### `idv-ml.yml` - ML Environment (PyTorch, Captum, Grad-CAM)

**Purpose**: Environment for running ML-dependent features including:
- Grad-CAM explainability
- CNN-based deepfake detection
- PyTorch model inference

**Key Dependencies**:
- Python 3.11 (required for Windows PyTorch compatibility)
- PyTorch (CPU-only for portability)
- torchvision & torchaudio
- Captum (for explainability)
- NumPy 1.26.x
- OpenCV
- Matplotlib
- Pillow

**Setup**:
```bash
# Automated setup (Windows)
.\scripts\setup_ml_env.ps1

# Manual setup
conda env create -f envs/idv-ml.yml
conda activate idv-ml
```

**Usage**:
```bash
# Activate environment
conda activate idv-ml

# Run ML tests
pytest tests/test_cnn_deepfake.py::TestGradCAM -v
pytest tests/test_cnn_deepfake.py::TestModelWrappers -v

# Run demo
python demo/run_demo.py

# Verify installation
python -c "import torch; print('PyTorch version:', torch.__version__)"
```

## Environment Isolation

The Identity Verifier service is designed to work in two modes:

1. **Core Pipeline Mode** (default): Runs without ML dependencies
   - All core identity verification features work
   - Grad-CAM and CNN detection are gracefully skipped
   - Suitable for production deployments without GPU/ML requirements

2. **ML-Enhanced Mode**: Requires `idv-ml` environment
   - Full Grad-CAM explainability
   - CNN-based deepfake detection
   - Advanced ML features enabled

## Important Notes

⚠ **Python 3.12 Incompatibility**: Current PyTorch wheels for Windows do not support Python 3.12. This environment uses Python 3.11 for stability.

⚠ **CPU-Only Configuration**: The default configuration uses CPU-only PyTorch for maximum portability. For GPU acceleration, modify `idv-ml.yml`:
- Replace `pytorch-cpu` with `pytorch`
- Replace `cpuonly` with appropriate CUDA version (e.g., `cudatoolkit=11.8`)

⚠ **Cross-Platform Notes**:
- Linux/Mac: Environment should work out-of-the-box
- Windows: Tested with Windows 10/11 and PowerShell
- WSL2: Use Linux instructions

## Troubleshooting

### "Conda not found"
Install Miniconda: https://docs.conda.io/en/latest/miniconda.html

### "Solving environment" takes too long
Try using mamba (faster conda):
```bash
conda install -n base -c conda-forge mamba
mamba env create -f envs/idv-ml.yml
```

### NumPy/OpenCV version conflicts
The environment pins specific versions to avoid conflicts. If you need different versions, modify `idv-ml.yml` carefully.

### Import errors after activation
Ensure the environment is activated:
```bash
conda info --envs  # Check active environment (should show *)
conda activate idv-ml
```

## Updating Environments

To update the environment after modifying `idv-ml.yml`:

```bash
# Remove old environment
conda env remove -n idv-ml

# Recreate
conda env create -f envs/idv-ml.yml

# Or use automated script
.\scripts\setup_ml_env.ps1
```

## CI/CD

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs tests in both modes:
- **test-core**: Tests without ML dependencies
- **test-ml**: Tests with full ML environment
- **integration**: Combined testing

This ensures the service works correctly in both deployment scenarios.
