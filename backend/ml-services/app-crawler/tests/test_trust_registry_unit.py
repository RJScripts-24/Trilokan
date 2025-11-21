import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import pytest
from unittest.mock import Mock, patch
from app_detector import check_trust_integrity

# Example registry entry for SBI
TRUST_REGISTRY = {
    "com.sbi.yono": {
        "publisher": "State Bank of India",
        "official_signatures": ["SHA256:OFFICIAL-SBI-SIGNATURE"],
        "canonical_icon_phash": "abcd1234phash",
        "ingested_at": "2025-11-22T00:00:00Z"
    }
}

@patch("app_detector.CANONICAL_TRUST_REGISTRY", TRUST_REGISTRY)
def test_official_apk_match():
    apk = Mock()
    apk.get_package.return_value = "com.sbi.yono"
    apk.get_cert_fingerprint.return_value = "SHA256:OFFICIAL-SBI-SIGNATURE"
    apk.get_icon_phash.return_value = "abcd1234phash"
    result = {}
    check_trust_integrity(apk, result)
    assert result["trust_verdict"].lower() == "safe"
    assert result["trust_score"] == 0.0

@patch("app_detector.CANONICAL_TRUST_REGISTRY", TRUST_REGISTRY)
def test_icon_clone_fraud():
    apk = Mock()
    apk.get_package.return_value = "com.sbi.yono"
    apk.get_cert_fingerprint.return_value = "SHA256:RANDOM-DEV-SIGNATURE"
    apk.get_icon_phash.return_value = "abcd1234phash"
    result = {}
    check_trust_integrity(apk, result)
    assert result["trust_verdict"].lower() == "fraud"
    assert result["trust_score"] == 1.0
    assert "Icon Clone" in result["trust_reason"]

@patch("app_detector.CANONICAL_TRUST_REGISTRY", TRUST_REGISTRY)
def test_rotation_mismatch():
    apk = Mock()
    apk.get_package.return_value = "com.sbi.yono"
    apk.get_cert_fingerprint.return_value = "SHA256:NEW-ROTATED-SIGNATURE"
    apk.get_icon_phash.return_value = "differentphash"
    result = {}
    check_trust_integrity(apk, result)
    # Should be suspicious/rotation candidate
    assert result["trust_verdict"].lower() == "suspicious"
    assert result["trust_score"] == 0.8
    assert "modified icon" in result["trust_reason"].lower() or "rotation" in result["trust_reason"].lower()
