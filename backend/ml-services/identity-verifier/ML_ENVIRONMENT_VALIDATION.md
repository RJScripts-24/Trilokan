# ML Environment Setup - Validation Checklist

This document provides a checklist to validate the ML environment setup and ensure all components work correctly.

## Created Files

### 1. Environment Configuration
- ✅ `envs/idv-ml.yml` - Conda environment specification
- ✅ `envs/README.md` - Environment documentation

### 2. Setup Automation
- ✅ `scripts/setup_ml_env.ps1` - PowerShell setup script for Windows

### 3. CI/CD
- ✅ `.github/workflows/ci.yml` - GitHub Actions workflow with matrix testing

### 4. Documentation
- ✅ `docs/DEVELOPMENT_GUIDE.md` - Updated with ML environment section

### 5. Code Updates
- ✅ `models/xception_wrapper.py` - Lazy torch imports with safe fallback
- ✅ `models/efficientnet_wrapper.py` - Lazy torch imports with safe fallback
- ✅ `models/cnn_deepfake.py` - Added HAS_TORCH check and error handling
- ✅ `explain/gradcam_utils.py` - Already had safe fallback (verified)

## Validation Steps

### Step 1: Environment Creation

Run the setup script:
```powershell
.\scripts\setup_ml_env.ps1
```

**Expected Output**:
- Conda installation check passes
- Environment `idv-ml` is created successfully
- Instructions are displayed for next steps

**Manual Alternative**:
```bash
conda env create -f envs/idv-ml.yml
conda activate idv-ml
```

### Step 2: Verify PyTorch Installation

```bash
conda activate idv-ml
python -c "import torch; print('PyTorch version:', torch.__version__)"
python -c "import torchvision; print('torchvision version:', torchvision.__version__)"
python -c "import captum; print('Captum version:', captum.__version__)"
```

**Expected Output**:
- PyTorch version: 2.x.x
- torchvision version: 0.x.x
- Captum version: 0.7.0

### Step 3: Test Imports Without ML Environment

Deactivate ML environment and test core imports:

```bash
conda deactivate
python -c "from models.cnn_deepfake import DeepfakeCNN; print('✓ Legacy import works')"
python -c "from explain.gradcam_utils import create_heatmap_overlay; print('✓ Grad-CAM utils import works')"
```

**Expected Output**:
- No import errors
- Graceful warnings about PyTorch not being available

### Step 4: Test Imports With ML Environment

Activate ML environment and test ML imports:

```bash
conda activate idv-ml
python -c "from models.cnn_deepfake import get_detector; detector = get_detector('xception'); print('✓ Detector factory works')"
python -c "from explain.gradcam_utils import GradCAM; print('✓ GradCAM class available')"
```

**Expected Output**:
- Detector initialized (with checkpoint warning if files not present)
- No import errors

### Step 5: Test Grad-CAM Functionality

```bash
conda activate idv-ml
python -c "
import numpy as np
from explain.gradcam_utils import create_heatmap_overlay

# Create test image and heatmap
img = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
cam = np.random.rand(100, 100).astype(np.float32)

# Generate overlay
overlay = create_heatmap_overlay(img, cam)

print('✓ Grad-CAM overlay generation works')
print(f'Overlay shape: {overlay.shape}')
print(f'Overlay dtype: {overlay.dtype}')
"
```

**Expected Output**:
- Overlay shape: (100, 100, 3)
- Overlay dtype: uint8
- No errors

### Step 6: Test Error Handling Without PyTorch

```bash
conda deactivate
python -c "
from models.cnn_deepfake import get_detector
try:
    detector = get_detector('xception')
    print('❌ Should have raised ImportError')
except ImportError as e:
    if 'PyTorch is not installed' in str(e):
        print('✓ Proper error message for missing PyTorch')
    else:
        print(f'❌ Wrong error message: {e}')
"
```

**Expected Output**:
- ✓ Proper error message for missing PyTorch

### Step 7: Run Tests (Core Environment)

```bash
conda deactivate
pytest tests/ -v --ignore=tests/test_cnn_deepfake.py -k "not gradcam and not GradCAM"
```

**Expected Output**:
- Core tests pass
- ML-specific tests are skipped

### Step 8: Run Tests (ML Environment)

```bash
conda activate idv-ml
pytest tests/test_cnn_deepfake.py -v
```

**Expected Output**:
- ML tests pass (or skip gracefully if test files not implemented yet)
- Grad-CAM tests execute successfully

### Step 9: Test CI/CD Workflow Locally (Optional)

If you have `act` installed (https://github.com/nektos/act):

```bash
act -j test-core
act -j test-ml
```

**Expected Output**:
- Both jobs complete successfully

### Step 10: Verify Documentation

Check that documentation is complete and accurate:

- ✅ `docs/DEVELOPMENT_GUIDE.md` has ML Environment Setup section
- ✅ Section includes Miniconda installation instructions
- ✅ Section includes environment creation commands
- ✅ Section includes Python 3.12 incompatibility warning
- ✅ Section includes test running instructions

## Common Issues and Solutions

### Issue 1: "Conda command not found"
**Solution**: Install Miniconda and restart terminal, or run:
```powershell
# Add conda to PATH temporarily
$env:PATH += ";C:\Users\$env:USERNAME\miniconda3\Scripts"
```

### Issue 2: "Solving environment" hangs
**Solution**: Use mamba instead:
```bash
conda install -n base -c conda-forge mamba
mamba env create -f envs/idv-ml.yml
```

### Issue 3: NumPy/OpenCV version conflicts
**Solution**: Environment should handle this automatically. If issues persist:
```bash
conda env remove -n idv-ml
conda env create -f envs/idv-ml.yml --force
```

### Issue 4: PyTorch import errors in ML environment
**Solution**: Verify environment is activated:
```bash
conda info --envs  # Should show * next to idv-ml
conda activate idv-ml
```

### Issue 5: Type hint errors in IDE (Pylance)
**Expected**: These are normal when PyTorch is not installed in the main environment. They will disappear when using the `idv-ml` environment.

## Success Criteria

All of the following should be true:

- ✅ Environment `idv-ml` can be created successfully
- ✅ PyTorch, torchvision, and Captum are installed
- ✅ Core pipeline works WITHOUT ML environment (no crashes)
- ✅ ML features work WITH ML environment activated
- ✅ Proper error messages when torch is unavailable
- ✅ Grad-CAM overlay generation works
- ✅ Tests pass in both environments
- ✅ Documentation is complete and accurate
- ✅ CI/CD workflow is configured for both environments

## Next Steps After Validation

1. **Train or Download Models**: Place model checkpoints in `models/exports/`:
   - `xception_ffpp.pth`
   - `efficientnet_b0_df.pth`

2. **Run Full Integration Tests**: Test with real video data

3. **Deploy**: Choose deployment mode:
   - **Core Mode**: Standard deployment without ML dependencies
   - **ML Mode**: Deploy with `idv-ml` environment for full features

4. **Monitor**: Check logs for:
   - Warnings about missing PyTorch (expected in core mode)
   - Successful Grad-CAM generation (in ML mode)
   - Model loading success/failures

## Validation Date

Completed: {DATE}
Validated By: {NAME}
Environment: Windows 10/11 with PowerShell 5.1
Python Version: 3.11
Conda Version: {VERSION}

---

**Status**: ✅ Ready for use
