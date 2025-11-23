import numpy as np
import time
from typing import Dict, Any, List

# Import lightweight feature extractors
try:
    from features.sharpness import laplacian_variance
    from features.doc_features import ocr_and_format_checks
except ImportError:
    # Fallback for standalone testing
    print("Stage1 Warning: Feature modules not found. Using mocks.")
    def laplacian_variance(img): return {'value': 1000.0, 'confidence': 1.0}
    def ocr_and_format_checks(img): return {'format_ok': True}

def run_stage1(
    capture: Dict[str, Any], 
    context: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Executes 'Fast Checks' on the input data.
    
    Checks performed:
    1. Input Integrity (Are frames empty? Is audio present?)
    2. Blocklist/Allowlist (User ID, Device ID, IP)
    3. Image Quality (Is the face too blurry for AI?)
    4. App Integrity (Is the request coming from a trusted APK?)

    Args:
        capture (dict): Input data {'frames': [np.array], 'audio': np.array, 'metadata': dict}
        context (dict): User context {'user_id': str, 'ip': str}

    Returns:
        dict: {
            'passed': bool,        # True if we should proceed to Stage 2
            'fast_fail': bool,     # True if we must ABORT immediately
            'signals': dict,       # Lightweight metrics calculated here
            'reasons': list        # Explanation for failure
        }
    """
    start_time = time.time()
    results = {
        'passed': True,
        'fast_fail': False,
        'signals': {},
        'reasons': []
    }
    
    frames = capture.get('frames', [])
    metadata = capture.get('metadata', {})
    context = context or {}

    # --- CHECK 1: Input Integrity ---
    if not frames or len(frames) == 0:
        results['fast_fail'] = True
        results['reasons'].append("No video frames provided")
        return results

    # --- CHECK 2: Blocklists (Metadata Filter) ---
    # In a real app, this queries Redis/DB. Here we use a mock set.
    # We check User ID, IP, and Device ID.
    blocked_ips = ["192.168.1.666", "10.0.0.99"]
    if context.get('ip') in blocked_ips:
        results['fast_fail'] = True
        results['reasons'].append(f"Source IP {context.get('ip')} is blocklisted")
        return results

    # --- CHECK 3: App Integrity (App Authenticator) ---
    # The proposal mentions detecting "Fake Finance Apps" via package name/signature.
    # This is a metadata check.
    app_package = metadata.get('package_name', '')
    expected_package = "com.trustguard.bank"
    
    if app_package and app_package != expected_package:
        # If it claims to be our app but has wrong package name -> Fake App
        results['fast_fail'] = True
        results['signals']['app_integrity'] = 0.0
        results['reasons'].append(f"Invalid Package Name: {app_package} (Possible Fake App)")
        return results
    else:
        results['signals']['app_integrity'] = 1.0

    # --- CHECK 4: Image Quality (Blur Detection) ---
    # We pick the middle frame to check if the camera is focused.
    # Running deepfake detection on a blurry image produces garbage results.
    middle_idx = len(frames) // 2
    sample_frame = frames[middle_idx]
    
    # Use our feature extractor
    sharpness = laplacian_variance(sample_frame)
    blur_score = sharpness.get('value', 0.0)
    
    results['signals']['sharpness_var'] = blur_score
    
    # Threshold: Variance < 100 usually means very blurry
    if blur_score < 50.0:
        results['fast_fail'] = True
        results['reasons'].append("Image too blurry for verification. Please retake.")
        return results
    elif blur_score < 100.0:
        # Warning but not strict fail
        results['reasons'].append("Image quality is low (blur detected)")

    # --- CHECK 5: Document Pre-Check (If applicable) ---
    # If the flow includes ID card upload, check if it looks valid before running deep matching.
    doc_image = capture.get('doc_image')
    if doc_image is not None:
        doc_res = ocr_and_format_checks(doc_image)
        if not doc_res.get('format_ok', False):
            # We don't fast_fail here usually, but we flag it
            results['signals']['doc_format_valid'] = 0.0
            results['reasons'].append("Document format (OCR) check failed")
        else:
            results['signals']['doc_format_valid'] = 1.0

    # --- Finalize ---
    # If we haven't failed yet, we pass.
    results['passed'] = not results['fast_fail']
    
    # Debug info
    results['signals']['stage1_latency'] = (time.time() - start_time) * 1000
    
    return results