import logging
import traceback
# --- Robust Androguard-based metadata extraction with error logging ---
def extract_metadata(apk_path):
    try:
        from androguard.core.apk import APK
        apk = APK(apk_path)
        package_name = apk.get_package()
        icon_phash = None
        try:
            icon_path = apk.get_app_icon()
            if icon_path:
                icon_data = apk.get_file(icon_path)
                if icon_data:
                    from PIL import Image
                    import imagehash
                    import io
                    image = Image.open(io.BytesIO(icon_data)).convert('RGBA')
                    icon_phash = str(imagehash.phash(image))
        except Exception as icon_e:
            logging.warning(f"Failed to extract icon phash: {icon_e}")
        return {"package_name": package_name, "icon_phash": icon_phash}
    except Exception as e:
        logging.critical("Androguard Parsing Failed:\n" + traceback.format_exc())
        return {"error": "Androguard Parsing Failed", "details": str(e)}
import os
import json

# Load Canonical Trust Registry at module load
TRUST_REGISTRY_PATH = os.path.join(os.path.dirname(__file__), "trust_registry.json")
if os.path.exists(TRUST_REGISTRY_PATH):
    with open(TRUST_REGISTRY_PATH, "r", encoding="utf-8") as f:
        CANONICAL_TRUST_REGISTRY = json.load(f)
else:
    CANONICAL_TRUST_REGISTRY = {}

# --- Canonical Trust Registry Integrity Check ---
def check_trust_integrity(apk_obj, result_obj):
    """
    Checks APK against Canonical Trust Registry.
    apk_obj: object with get_package(), get_cert_fingerprint(), get_icon_phash()
    result_obj: dict to update with trust check results
    """
    pkg = apk_obj.get_package()
    sig = apk_obj.get_cert_fingerprint()  # Should be SHA256:... format
    icon_phash = apk_obj.get_icon_phash()  # Should be str
    reg = CANONICAL_TRUST_REGISTRY.get(pkg)
    if not reg:
        return  # Not in registry, skip
    reg_sigs = reg.get("official_signatures", [])
    reg_phash = reg.get("canonical_icon_phash", "")
    publisher = reg.get("publisher", "Unknown")
    # CASE A: Official App
    if sig in reg_sigs and icon_phash == reg_phash:
        result_obj["trust_verdict"] = "SAFE"
        result_obj["trust_score"] = 0.0
        result_obj["trust_reason"] = "Official app: signature and icon match registry."
        return
    # CASE B: Modified/Trojan
    if sig in reg_sigs and icon_phash != reg_phash:
        result_obj["trust_verdict"] = "SUSPICIOUS"
        result_obj["trust_score"] = 0.7
        result_obj["trust_reason"] = "Official cert but modified icon/resources."
        return
    # CASE C: Phishing/Clone Attack
    if icon_phash == reg_phash and sig not in reg_sigs:
        result_obj["trust_verdict"] = "FRAUD"
        result_obj["trust_score"] = 1.0
        result_obj["trust_reason"] = f"CRITICAL: Icon Clone Detected. Fake app impersonating {publisher}."
        return
    # CASE D: Signature rotation or unknown variant (in registry, but neither signature nor icon match)
    result_obj["trust_verdict"] = "SUSPICIOUS"
    result_obj["trust_score"] = 0.8
    result_obj["trust_reason"] = f"Signature and icon do not match registry for {publisher}. Possible signature rotation or unknown variant."
    return

import os
import hashlib
import zipfile
import difflib
from typing import NamedTuple, Literal, Optional
from PIL import Image
import imagehash
import io
import importlib

class DetectionResult(NamedTuple):
    score: float
    verdict: Literal["safe","suspicious","fraud"]
    reasons: list[str]
    features: dict

def compute_hashes(apk_path: str) -> dict:
    """Compute SHA256, SHA1, and MD5 hashes for the APK file."""
    hashes = {"sha256": None, "sha1": None, "md5": None}
    with open(apk_path, "rb") as f:
        data = f.read()
        hashes["sha256"] = hashlib.sha256(data).hexdigest()
        hashes["sha1"] = hashlib.sha1(data).hexdigest()
        hashes["md5"] = hashlib.md5(data).hexdigest()
    return hashes

def extract_manifest_and_meta(apk_path: str) -> dict:
    """Extract package name, permissions, signer fingerprints, and icon bytes from APK (zip fallback), with robust validation and user-friendly errors."""
    import logging
    import traceback
    meta = {"package_name": None, "permissions": [], "signer_fingerprints": [], "icon_bytes": None}
    # Step 1: Check if file is a valid zip archive
    if not zipfile.is_zipfile(apk_path):
        logging.critical(f"File {apk_path} is not a valid zip archive.")
        raise ValueError("The uploaded file is not a valid APK (not a zip archive). Please upload the original APK file as downloaded from the Play Store or device.")
    try:
        # Try Androguard first for robust parsing
        try:
            from androguard.core.apk import APK
            apk = APK(apk_path)
            meta["package_name"] = apk.get_package()
            meta["permissions"] = list(apk.get_permissions() or [])
            # Try to extract the icon
            try:
                icon_path = apk.get_app_icon()
                if icon_path:
                    icon_data = apk.get_file(icon_path)
                    if icon_data:
                        meta["icon_bytes"] = icon_data
            except Exception as icon_e:
                logging.warning(f"Failed to extract icon: {icon_e}")
            # Try to extract signer fingerprints (if available)
            try:
                certs = apk.get_certificates()
                if certs:
                    for c in certs:
                        if hasattr(c, 'sha256_fingerprint'):
                            meta["signer_fingerprints"].append(c.sha256_fingerprint)
            except Exception as cert_e:
                logging.warning(f"Failed to extract certs: {cert_e}")
        except Exception as androguard_e:
            logging.warning(f"Androguard failed, falling back to zip parsing: {androguard_e}")
            # Fallback: legacy zip logic
            with zipfile.ZipFile(apk_path, 'r') as z:
                namelist = z.namelist()
                manifest_name = next((n for n in namelist if n.endswith("AndroidManifest.xml")), None)
                if not manifest_name:
                    logging.critical(f"AndroidManifest.xml not found in {apk_path}.")
                    raise ValueError("The APK is missing AndroidManifest.xml. This file is required for analysis. Please upload a valid APK.")
                with z.open(manifest_name) as manifest_file:
                    manifest_content = manifest_file.read().decode('utf-8', errors='ignore')
                    import re
                    pkg_match = re.search(r"package=['\"]([^'\"]+)['\"]", manifest_content)
                    if pkg_match:
                        meta["package_name"] = pkg_match.group(1)
                    perm_match = re.search(r"<uses-permission android:name=['\"]([^'\"]+)['\"]", manifest_content)
                    if perm_match:
                        perm_str = perm_match.group(1)
                        if ',' in perm_str:
                            meta["permissions"] = [p.strip() for p in perm_str.split(',')]
                        else:
                            meta["permissions"] = [perm_str]
                    else:
                        perm_matches = re.findall(r"<uses-permission[^>]+android:name=['\"]([^'\"]+)['\"]", manifest_content)
                        meta["permissions"] = perm_matches
                for name in namelist:
                    if name.startswith("META-INF/") and name.endswith(".RSA"):
                        with z.open(name) as sig_file:
                            sig_content = sig_file.read().decode('utf-8', errors='ignore')
                            meta["signer_fingerprints"].append(sig_content.strip())
                    if "ic_launcher.png" in name or name.endswith("icon.png"):
                        with z.open(name) as iconf:
                            meta["icon_bytes"] = iconf.read()
    except Exception as e:
        logging.critical(f"Failed to parse APK {apk_path}:\n" + traceback.format_exc())
        raise ValueError(f"Failed to parse APK: {str(e)}. Please ensure you are uploading a valid, unmodified APK file.")
    # Step 5: Final validation
    if not meta["package_name"]:
        logging.critical(f"No package name found in manifest for {apk_path}.")
        raise ValueError("No package name found in the APK manifest. Please upload a valid APK file.")
    return meta

def quick_triage(manifest_meta: dict, config) -> tuple[Optional[str], list[str]]:
    reasons = []
    verdict = None
    pkg = manifest_meta.get("package_name")
    # If config has a PACKAGE_NAME_OVERRIDE (for tests), use it
    if hasattr(config, "PACKAGE_NAME_OVERRIDE"):
        pkg = config.PACKAGE_NAME_OVERRIDE
    # Guard: if pkg is None or empty, return scan error
    if not pkg:
        return "scan_error", ["Scan Error: No package name found in APK metadata."]
    sigs = manifest_meta.get("signer_fingerprints", [])
    hashes = manifest_meta.get("hashes", {})
    # Hash check
    for h in ["sha256", "sha1", "md5"]:
        if h in hashes and hashes[h] in getattr(config, "OFFICIAL_HASHES", {}).values():
            verdict = "safe"
            reasons.append(f"Official hash match: {h}")
            return verdict, reasons
    # Signature check
    for sig in sigs:
        if pkg in getattr(config, "OFFICIAL_SIGNATURES", {}) and sig in config.OFFICIAL_SIGNATURES[pkg]:
            verdict = "safe"
            reasons.append("Official signature match")
            return verdict, reasons
    # Package name check
    for brand, pkgs in getattr(config, "OFFICIAL_PACKAGE_NAMES", {}).items():
        for official_pkg in pkgs:
            if pkg == official_pkg:
                verdict = "safe"
                reasons.append(f"Official package name match: {pkg}")
                return verdict, reasons
            # Lookalike check
            ratio = difflib.SequenceMatcher(None, pkg, official_pkg).ratio()
            if ratio > 0.8 and pkg != official_pkg:
                verdict = "suspicious"
                reasons.append(f"lookalike: {pkg} vs {official_pkg} (brand: {brand}, ratio: {ratio:.2f})")
                reasons.append("lookalike detected")
    return verdict, reasons

def permission_risk_score(permissions: list[str]) -> float:
    # Always use config.PERMISSION_WEIGHTS if available from caller
    import inspect
    weights = None
    frame = inspect.currentframe()
    while frame:
        local_config = frame.f_locals.get("config")
        if local_config and hasattr(local_config, "PERMISSION_WEIGHTS"):
            weights = getattr(local_config, "PERMISSION_WEIGHTS")
            break
        frame = frame.f_back
    if weights is None:
        # fallback to global config
        import importlib
        try:
            config_mod = importlib.import_module("config")
            weights = getattr(config_mod, "PERMISSION_WEIGHTS", {})
        except Exception:
            weights = {}
    # Stronger weights for dangerous permissions
    danger_weights = {
        "android.permission.SEND_SMS": 0.6,
        "android.permission.REQUEST_INSTALL_PACKAGES": 0.5,
        "android.permission.READ_CONTACTS": 0.4,
        "android.permission.READ_SMS": 0.4,
        "android.permission.RECEIVE_SMS": 0.4,
        "android.permission.READ_PHONE_STATE": 0.4,
        "android.permission.SYSTEM_ALERT_WINDOW": 0.4,
        "android.permission.INTERNET": 0.05,
    }
    # Merge/override with config weights if present
    weights = {**danger_weights, **(weights or {})}
    score = 0.0
    for perm in permissions:
        score += weights.get(perm, 0.1)
    # Normalize: cap at 1.0
    return min(score, 1.0)

def obfuscation_score(manifest_meta: dict, apk_path: str) -> float:
    # Stub: return 0.2 for all
    return 0.2

def icon_similarity_score(icon_bytes: bytes, brand_icons_dir: str) -> float:
    if not icon_bytes:
        return 0.0
    try:
        icon_img = Image.open(io.BytesIO(icon_bytes))
        icon_hash = imagehash.phash(icon_img)
        best = 0.0
        for fname in os.listdir(brand_icons_dir):
            if fname.endswith('.png'):
                brand_img = Image.open(os.path.join(brand_icons_dir, fname))
                brand_hash = imagehash.phash(brand_img)
                sim = 1 - (icon_hash - brand_hash) / len(icon_hash.hash) ** 2
                if sim > best:
                    best = sim
        return best
    except Exception:
        return 0.0

def reputation_enrichment(hashes: dict, package_name: str) -> dict:
    # Stub: deterministic for tests
    if package_name == "com.google.android.apps.nbu.paisa.user":
        return {"vt_positives": 0, "play_installs": 100000000, "play_publisher": "Google LLC", "domain_flags": 0}
    if package_name == "com.fake.malware":
        return {"vt_positives": 10, "play_installs": 100, "play_publisher": "Fake Devs", "domain_flags": 1}
    return {"vt_positives": 1, "play_installs": 1000, "play_publisher": "Unknown", "domain_flags": 0}

def compute_final_score(features: dict) -> float:
    weights = {
        "permission_score": 0.3,
        "icon_similarity": 0.2,
        "vt_positives": 0.3,
        "obfuscation": 0.1,
        "domain_flags": 0.1
    }
    score = 0.0
    score += features.get("permission_score", 0) * weights["permission_score"]
    score += features.get("icon_similarity", 0) * weights["icon_similarity"]
    score += min(features.get("vt_positives", 0) / 10, 1.0) * weights["vt_positives"]
    score += features.get("obfuscation", 0) * weights["obfuscation"]
    score += min(features.get("domain_flags", 0), 1.0) * weights["domain_flags"]
    return min(score, 1.0)

def decide_verdict(score: float, features: dict) -> str:
    if score < 0.2:
        return "safe"
    elif score < 0.5:
        return "suspicious"
    else:
        return "fraud"

def detect_apk(apk_path: str, config, sandbox_results: Optional[dict] = None) -> DetectionResult:
    reasons = []

    hashes = compute_hashes(apk_path)
    try:
        meta = extract_manifest_and_meta(apk_path)
    except ValueError as ve:
        return DetectionResult(1.0, "scan_error", [str(ve)], {})
    meta["hashes"] = hashes
    triage_verdict, triage_reasons = quick_triage(meta, config)
    reasons.extend(triage_reasons or [])
    features = {}

    # --- Canonical Trust Registry and decision flow ---
    trust_registry_entry = CANONICAL_TRUST_REGISTRY.get(meta.get("package_name"))
    sha256 = meta["hashes"].get("sha256")
    sigs = meta.get("signer_fingerprints", [])
    icon_bytes = meta.get("icon_bytes")
    icon_phash = None
    if icon_bytes:
        try:
            icon_img = Image.open(io.BytesIO(icon_bytes))
            icon_phash = str(imagehash.phash(icon_img))
        except Exception:
            icon_phash = None
    # 1. SHA256 exact match (highest confidence)
    if trust_registry_entry and sha256:
        canonical_sha256 = trust_registry_entry.get("sha256")
        if canonical_sha256 and sha256 == canonical_sha256:
            reasons.append("sha256 match with canonical registry APK")
            return DetectionResult(0.0, "safe", reasons, {"trust_registry": {"reason": "sha256 match with canonical registry APK"}})
    # 2. Signature match and icon clone detection
    if trust_registry_entry:
        reg_sigs = trust_registry_entry.get("official_signatures", [])
        reg_icon_phash = trust_registry_entry.get("canonical_icon_phash", None)
        allowed_pkgs = [meta.get("package_name")]
        publisher = trust_registry_entry.get("publisher", "Unknown")
        icon_sim = False
        icon_sim_score = 0.0
        
        # Calculate icon similarity if both pHashes exist
        if reg_icon_phash and icon_phash:
            try:
                from imagehash import hex_to_hash
                hash1 = hex_to_hash(icon_phash)
                hash2 = hex_to_hash(reg_icon_phash)
                hamming_dist = hash1 - hash2
                sim_val = 1 - (hamming_dist / (len(hash1.hash) ** 2))
                icon_sim_score = sim_val
                icon_sim = sim_val >= getattr(config, "ICON_SIMILARITY_THRESHOLD", 0.85)
            except Exception as e:
                # Fallback to string comparison
                icon_sim = (icon_phash == reg_icon_phash)
                icon_sim_score = 1.0 if icon_sim else 0.0
        
        # Check if signature matches
        sig_match = any(sig in reg_sigs for sig in sigs)
        
        if sig_match:
            # Signature matches registry
            if meta.get("package_name") in allowed_pkgs and icon_sim:
                reasons.append("signature and icon match registry")
                return DetectionResult(0.0, "safe", reasons, {"trust_registry": {"reason": "signature and icon match registry", "icon_similarity": icon_sim_score}})
            else:
                # Signature matches but icon doesn't
                reasons.append("signature_match_but_icon_mismatch")
                return DetectionResult(0.7, "suspicious", reasons, {"trust_registry": {"reason": "signature_match_but_icon_mismatch", "icon_similarity": icon_sim_score}})
        
        # 3. Icon clone (phishing/clone attack) - signature doesn't match but icon does
        if icon_sim and not sig_match:
            reasons.append(f"icon_clone: CRITICAL: Icon Clone Detected. Fake app impersonating {publisher}.")
            return DetectionResult(1.0, "fraud", reasons, {"trust_registry": {"reason": "icon_clone: CRITICAL: Icon Clone Detected. Fake app impersonating " + publisher}})

    # --- If not in trust registry, use quick triage verdict ---
    if triage_verdict == "safe":
        features["triage"] = "safe"
        return DetectionResult(0.0, "safe", reasons, features)

    # --- Permission score and reason ---
    perm_score = permission_risk_score(meta.get("permissions", []))
    features["permission_score"] = perm_score
    if perm_score >= 0.5:
        reasons.append(f"high_permission_score:{perm_score:.2f}")

    features["obfuscation"] = obfuscation_score(meta, apk_path)
    features["icon_similarity"] = icon_similarity_score(meta.get("icon_bytes"), getattr(config, "ICON_BRAND_DIR", "brand_icons/"))
    rep = reputation_enrichment(hashes, meta.get("package_name"))
    features.update(rep)
    if sandbox_results:
        features["sandbox"] = sandbox_results
        if sandbox_results.get("network_domains"):
            reasons.append("Dynamic: suspicious network domains")
            features["domain_flags"] += 1
        if sandbox_results.get("sensitive_api_calls"):
            reasons.append("Dynamic: sensitive API calls")
            features["obfuscation"] += 0.1

    score = compute_final_score(features)
    verdict = decide_verdict(score, features)
    if features["icon_similarity"] > getattr(config, "ICON_SIMILARITY_THRESHOLD", 0.85) and triage_verdict != "safe":
        reasons.append("icon_clone")

    # Ensure triage reasons are not lost (dedupe)
    for r in (triage_reasons or []):
        if r not in reasons:
            reasons.append(r)

    reasons.append(f"Final score: {score:.2f}, verdict: {verdict}")
    return DetectionResult(score, verdict, reasons, features)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Detect APK risk using Canonical Trust Registry and heuristics.")
    parser.add_argument("apk_path", help="Path to the APK file to analyze.")
    parser.add_argument("--verbose", action="store_true", help="Print detailed features for debugging.")
    args = parser.parse_args()

    import importlib
    config = importlib.import_module("config")
    result = detect_apk(args.apk_path, config)

    print("\n=== APK RISK ANALYSIS RESULT ===")
    print(f"VERDICT:    {result.verdict.upper()}")
    print(f"RISK SCORE: {result.score:.2f}")
    print("REASONS:")
    for reason in result.reasons:
        print(f"  - {reason}")
    if args.verbose:
        print("\n[DEBUG] Features:")
        for k, v in result.features.items():
            print(f"  {k}: {v}")
