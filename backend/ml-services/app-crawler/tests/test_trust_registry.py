import os
import sys
import json
import pytest
from PIL import Image
import io
import zipfile
import numpy as np
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app_detector import detect_apk, DetectionResult

# Helper: create a fake APK (zip) with manifest, signature, and icon

def make_apk_with_icon_phash(path, package_name, signer_fp, icon_pattern, icon_phash=None):
    with zipfile.ZipFile(path, 'w') as z:
        z.writestr("AndroidManifest.xml", f"<manifest package='{package_name}'></manifest>")
        z.writestr("META-INF/CERT.RSA", signer_fp)
        img = Image.new('RGB', (32,32), color=(255, 255, 255))
        # Draw different patterns to ensure different pHash
        pixels = np.array(img)
        if icon_pattern == "original":
            # Create a specific pattern
            pixels[0:16, 0:16] = [255, 0, 0]
            pixels[16:32, 16:32] = [0, 0, 255]
        elif icon_pattern == "modified":
            # Create a different pattern
            pixels[0:16, 16:32] = [0, 255, 0]
            pixels[16:32, 0:16] = [255, 255, 0]
        elif icon_pattern == "clone":
            # Same as original
            pixels[0:16, 0:16] = [255, 0, 0]
            pixels[16:32, 16:32] = [0, 0, 255]
        img = Image.fromarray(pixels.astype('uint8'), 'RGB')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        z.writestr("res/mipmap-ic_launcher.png", buf.getvalue())

@pytest.fixture(scope="module")
def trust_registry_setup(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("trustreg")
    apk_path = tmp / "official_trust.apk"
    # Use a specific pattern for deterministic pHash
    make_apk_with_icon_phash(apk_path, "com.trust.test", "SHA256:AA:BB:CC:DD", "original")
    # Compute icon pHash for registry
    from app_detector import extract_manifest_and_meta
    meta = extract_manifest_and_meta(str(apk_path))
    from PIL import Image
    import imagehash
    icon_img = Image.open(io.BytesIO(meta["icon_bytes"]))
    phash = str(imagehash.phash(icon_img))
    # Write trust_registry.json
    reg = {
        "com.trust.test": {
            "publisher": "Test Publisher",
            "official_signatures": ["SHA256:AA:BB:CC:DD"],
            "canonical_icon_phash": phash,
            "ingested_at": "2025-11-22T00:00:00Z"
        }
    }
    reg_path = os.path.join(os.path.dirname(__file__), "..", "trust_registry.json")
    with open(reg_path, "w", encoding="utf-8") as f:
        json.dump(reg, f)
    return str(apk_path), phash

def test_trust_registry_safe(trust_registry_setup):
    apk_path, phash = trust_registry_setup
    class DummyConfig: pass
    result = detect_apk(apk_path, DummyConfig())
    assert result.verdict == "safe"
    assert any("Official app" in r or "signature and icon match" in r for r in result.reasons)

def test_trust_registry_suspicious(trust_registry_setup):
    apk_path, phash = trust_registry_setup
    # Create APK with same signature but different icon
    tmp_dir = os.path.dirname(apk_path)
    diff_apk = os.path.join(tmp_dir, "mod_icon.apk")
    make_apk_with_icon_phash(diff_apk, "com.trust.test", "SHA256:AA:BB:CC:DD", "modified")
    class DummyConfig: pass
    result = detect_apk(diff_apk, DummyConfig())
    assert result.verdict == "suspicious"
    assert "signature_match_but_icon_mismatch" in str(result.reasons)

def test_trust_registry_fraud(trust_registry_setup):
    apk_path, phash = trust_registry_setup
    # Create APK with different signature but same icon
    tmp_dir = os.path.dirname(apk_path)
    fraud_apk = os.path.join(tmp_dir, "fraud.apk")
    make_apk_with_icon_phash(fraud_apk, "com.trust.test", "SHA256:ZZ:ZZ:ZZ:ZZ", "clone")
    class DummyConfig: pass
    result = detect_apk(fraud_apk, DummyConfig())
    assert result.verdict == "fraud"
    assert "Icon Clone Detected" in str(result.reasons)
