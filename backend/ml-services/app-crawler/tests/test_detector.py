import os
import sys
import types
import pytest
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app_detector import detect_apk, DetectionResult

# Minimal config stub for tests
class TestConfig:
    TARGET_BRANDS = ["Google Pay", "FakeBrand"]
    OFFICIAL_PACKAGE_NAMES = {"Google Pay": ["com.google.android.apps.nbu.paisa.user"]}
    OFFICIAL_SIGNATURES = {"com.google.android.apps.nbu.paisa.user": ["AB:CD:EF:12:34:56:78:90"]}
    OFFICIAL_HASHES = {"com.google.android.apps.nbu.paisa.user": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"}
    ICON_BRAND_DIR = os.path.join(os.path.dirname(__file__), "assets/brand_icons/")
    PERMISSION_WEIGHTS = {"android.permission.SEND_SMS": 0.4, "android.permission.REQUEST_INSTALL_PACKAGES": 0.3}
    ICON_SIMILARITY_THRESHOLD = 0.85

# Helper: create a fake APK (zip) with manifest and icon
import zipfile
from PIL import Image
import io

def make_fake_apk(path, package_name, permissions, signer_fp, icon_color=(0,0,0)):
    with zipfile.ZipFile(path, 'w') as z:
        # Fake manifest
        z.writestr("AndroidManifest.xml", f"<manifest package='{package_name}'><uses-permission android:name='{','.join(permissions)}'/></manifest>")
        # Fake signature
        z.writestr("META-INF/CERT.RSA", signer_fp)
        # Fake icon
        img = Image.new('RGB', (32,32), color=icon_color)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        z.writestr("res/mipmap-ic_launcher.png", buf.getvalue())

@pytest.fixture(scope="module")
def setup_assets(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("assets")
    # Official APK
    official_apk = tmp / "official.apk"
    make_fake_apk(official_apk, "com.google.android.apps.nbu.paisa.user", ["android.permission.INTERNET"], "AB:CD:EF:12:34:56:78:90", (0,255,0))
    # Lookalike APK
    lookalike_apk = tmp / "lookalike.apk"
    make_fake_apk(lookalike_apk, "com.go0gle.android.apps.nbu.paisa.user", ["android.permission.INTERNET"], "ZZ:ZZ:ZZ:ZZ:ZZ:ZZ:ZZ:ZZ", (0,255,0))
    # Fraud APK
    fraud_apk = tmp / "fraud.apk"
    make_fake_apk(fraud_apk, "com.fake.malware", ["android.permission.SEND_SMS", "android.permission.REQUEST_INSTALL_PACKAGES"], "ZZ:ZZ:ZZ:ZZ:ZZ:ZZ:ZZ:ZZ", (255,0,0))
    # Icon clone APK
    icon_apk = tmp / "iconclone.apk"
    make_fake_apk(icon_apk, "com.icon.clone", ["android.permission.INTERNET"], "ZZ:ZZ:ZZ:ZZ:ZZ:ZZ:ZZ:ZZ", (0,255,0))
    # Brand icon
    brand_icon_dir = tmp / "brand_icons"
    brand_icon_dir.mkdir()
    img = Image.new('RGB', (32,32), color=(0,255,0))
    img.save(str(brand_icon_dir / "googlepay.png"))
    return {
        "official": str(official_apk),
        "lookalike": str(lookalike_apk),
        "fraud": str(fraud_apk),
        "iconclone": str(icon_apk),
        "brand_icons": str(brand_icon_dir)
    }

def test_official_apk_safe(setup_assets, monkeypatch):
    config = TestConfig()
    config.ICON_BRAND_DIR = setup_assets["brand_icons"]
    # Patch hash to match official
    monkeypatch.setattr("app_detector.compute_hashes", lambda x: {"sha256": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"})
    result = detect_apk(setup_assets["official"], config)
    assert result.verdict == "safe"
    assert any("Official" in r for r in result.reasons)

def test_lookalike_package_suspicious(setup_assets):
    config = TestConfig()
    config.ICON_BRAND_DIR = setup_assets["brand_icons"]
    result = detect_apk(setup_assets["lookalike"], config)
    assert result.verdict == "suspicious"
    assert any("lookalike" in r for r in result.reasons)

def test_fraud_apk_permissions_and_vt(setup_assets, monkeypatch):
    config = TestConfig()
    config.ICON_BRAND_DIR = setup_assets["brand_icons"]
    # Patch reputation_enrichment to return high vt_positives
    monkeypatch.setattr("app_detector.reputation_enrichment", lambda h, p: {"vt_positives": 10, "play_installs": 100, "play_publisher": "Fake Devs", "domain_flags": 1})
    result = detect_apk(setup_assets["fraud"], config)
    assert result.verdict == "fraud"
    assert result.features["vt_positives"] == 10
    assert result.features["permission_score"] > 0.5

def test_icon_similarity_clone_suspicious(setup_assets):
    config = TestConfig()
    config.ICON_BRAND_DIR = setup_assets["brand_icons"]
    result = detect_apk(setup_assets["iconclone"], config)
    assert result.verdict in ("suspicious", "fraud")
    assert "icon_clone" in result.reasons or result.features["icon_similarity"] > 0.85

def test_integration_detect_apk(setup_assets):
    config = TestConfig()
    config.ICON_BRAND_DIR = setup_assets["brand_icons"]
    result = detect_apk(setup_assets["official"], config)
    assert isinstance(result, DetectionResult)
    assert result.verdict in ("safe", "suspicious", "fraud")
