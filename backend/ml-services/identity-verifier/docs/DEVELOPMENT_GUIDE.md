# Development Guide

This guide describes how to set up the development environment, run tests, and add new signals to the Identity Verifier service.

## Local Development
1. **Clone the repository:**
   ```sh
   git clone <repo-url>
   ```
2. **Install dependencies:**
   ```sh
   pip install -r requirements.txt
   ```
3. **Run the application:**
   ```sh
   python app.py
   ```

## ML Environment Setup (PyTorch, Captum, Grad-CAM)

The Identity Verifier service includes advanced ML features like Grad-CAM explainability and CNN-based deepfake detection. These features require PyTorch and related dependencies, which are isolated in a separate Conda environment for stability.

### Prerequisites

Install Miniconda (or Anaconda) for Windows:
- Download: [https://docs.conda.io/en/latest/miniconda.html](https://docs.conda.io/en/latest/miniconda.html)
- Choose the **Python 3.11** installer for Windows
- During installation, check "Add Miniconda to PATH" (optional but recommended)
- Restart your terminal after installation

### Quick Setup

Run the automated setup script:

```powershell
.\scripts\setup_ml_env.ps1
```

This script will:
- Check for Conda installation
- Create the `idv-ml` environment with all ML dependencies
- Provide activation instructions and next steps

### Manual Setup

Alternatively, create the environment manually:

```sh
conda env create -f envs/idv-ml.yml
conda activate idv-ml
```

Verify the installation:

```sh
python -c "import torch; print('PyTorch version:', torch.__version__)"
```

### Environment Details

The `idv-ml` environment includes:
- **Python 3.11** (Python 3.12 is NOT compatible with current PyTorch wheels on Windows)
- **PyTorch (CPU-only)** for model inference and Grad-CAM
- **torchvision** and **torchaudio** for vision and audio models
- **Captum** for Grad-CAM and explainability features
- **NumPy 1.26.x** for numerical computations
- **OpenCV** for computer vision operations
- **Matplotlib** for visualizations

### Running ML-Dependent Tests

Activate the ML environment before running these tests:

```sh
conda activate idv-ml

# Test Grad-CAM functionality
pytest tests/test_cnn_deepfake.py::TestGradCAM -v

# Test CNN model wrappers
pytest tests/test_cnn_deepfake.py::TestModelWrappers -v

# Run all ML-related tests
pytest tests/test_cnn_deepfake.py -v
```

### Important Notes

⚠ **Python 3.12 Incompatibility**: Current PyTorch wheels for Windows do not support Python 3.12. The `idv-ml` environment uses Python 3.11 for stability.

⚠ **CPU-Only Configuration**: The environment uses CPU-only PyTorch for maximum portability. For GPU support, modify `envs/idv-ml.yml` to use `pytorch` instead of `pytorch-cpu` and add the appropriate CUDA dependencies.

⚠ **Core Pipeline Independence**: The core identity verification pipeline can run without the ML environment. When PyTorch is unavailable:
- Grad-CAM explanations are skipped
- CNN deepfake detection falls back to other signals
- The pipeline continues normally with a warning

### Switching Between Environments

To deactivate the ML environment:

```sh
conda deactivate
```

To list all Conda environments:

```sh
conda env list
```

To remove the ML environment:

```sh
conda env remove -n idv-ml
```

## Running Tests
- All tests are located in the `tests/` directory.
- To run all tests:
  ```sh
  pytest tests/
  ```
- To run a specific test file:
  ```sh
  pytest tests/test_face_processor.py
  ```

## Adding New Signals
1. **Create a new module** in `features/` or `modules/` as appropriate.
2. **Implement the signal extraction logic** following the structure of existing modules.
3. **Write tests** for your new signal in `tests/`.
4. **Update documentation** as needed.

## Coding Standards
- Follow PEP8 for Python code.
- Write docstrings for all public functions and classes.

---
**Version History**
- v1.0 (2025-11-23): Initial version.
