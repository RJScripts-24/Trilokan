#!/usr/bin/env python3
"""Quick validation test for ML environment setup"""

print("=" * 60)
print("ML Environment Validation Test")
print("=" * 60)
print()

# Test 1: Check torch availability
print("[1/5] Checking PyTorch availability...")
from models.cnn_deepfake import HAS_TORCH
print(f"   PyTorch installed: {HAS_TORCH}")
if not HAS_TORCH:
    print("   ⚠ PyTorch not available - ML features will be disabled")
else:
    print("   ✓ PyTorch is available")
print()

# Test 2: Test Grad-CAM utils import
print("[2/5] Testing Grad-CAM utils import...")
try:
    from explain.gradcam_utils import create_heatmap_overlay, HAS_TORCH as GRADCAM_HAS_TORCH
    print(f"   ✓ Grad-CAM utils imported successfully")
    print(f"   PyTorch available in gradcam_utils: {GRADCAM_HAS_TORCH}")
except Exception as e:
    print(f"   ❌ Failed to import Grad-CAM utils: {e}")
print()

# Test 3: Test heatmap generation (fallback mode)
print("[3/5] Testing heatmap generation (fallback mode)...")
try:
    import numpy as np
    img = np.random.randint(0, 255, (50, 50, 3), dtype=np.uint8)
    cam = np.random.rand(50, 50).astype(np.float32)
    overlay = create_heatmap_overlay(img, cam)
    print(f"   ✓ Overlay created: shape={overlay.shape}, dtype={overlay.dtype}")
except Exception as e:
    print(f"   ❌ Failed to create overlay: {e}")
print()

# Test 4: Test error handling for get_detector
print("[4/5] Testing error handling for get_detector...")
try:
    from models.cnn_deepfake import get_detector
    try:
        detector = get_detector('xception')
        if not HAS_TORCH:
            print("   ❌ Should have raised ImportError")
        else:
            print("   ✓ Detector created successfully (PyTorch available)")
    except ImportError as e:
        if "PyTorch is not installed" in str(e):
            print("   ✓ Proper error message for missing PyTorch")
        else:
            print(f"   ⚠ Different error: {e}")
except Exception as e:
    print(f"   ❌ Unexpected error: {e}")
print()

# Test 5: Test legacy imports
print("[5/5] Testing legacy imports...")
try:
    from models.cnn_deepfake import DeepfakeCNN
    print("   ✓ Legacy DeepfakeCNN import works")
except Exception as e:
    print(f"   ❌ Failed to import DeepfakeCNN: {e}")
print()

# Summary
print("=" * 60)
print("Validation Summary")
print("=" * 60)
if not HAS_TORCH:
    print("Status: ✓ Core pipeline mode (without ML)")
    print()
    print("Next steps:")
    print("  1. To enable ML features, run: conda activate idv-ml")
    print("  2. Or run setup script: .\\scripts\\setup_ml_env.ps1")
else:
    print("Status: ✓ ML mode enabled (PyTorch available)")
    print()
    print("Next steps:")
    print("  1. Run ML tests: pytest tests/test_cnn_deepfake.py -v")
    print("  2. Test Grad-CAM: python demo/run_demo.py")
print("=" * 60)
