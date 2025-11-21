import os
import json
import traceback
from datetime import datetime
from androguard.core.apk import APK
from androguard.core import androconf
from PIL import Image
import imagehash
import io

REFERENCE_APK_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../reference_apks/'))
OUTPUT_JSON = os.path.abspath(os.path.join(os.path.dirname(__file__), '../trust_registry.json'))

def extract_icon_phash(apk_obj):
	try:
		icon_path = apk_obj.get_app_icon()
		if not icon_path:
			print(f"[DEBUG] No icon path found for package: {apk_obj.get_package()}")
			return None
		icon_data = apk_obj.get_file(icon_path)
		if not icon_data:
			print(f"[DEBUG] Icon file not found in APK for path: {icon_path} (package: {apk_obj.get_package()})")
			return None
		try:
			image = Image.open(io.BytesIO(icon_data)).convert('RGBA')
		except Exception as e:
			print(f"[DEBUG] Failed to open icon image for {icon_path} (package: {apk_obj.get_package()}): {e}")
			return None
		try:
			phash = str(imagehash.phash(image))
		except Exception as e:
			print(f"[DEBUG] Failed to compute phash for {icon_path} (package: {apk_obj.get_package()}): {e}")
			return None
		return phash
	except Exception as e:
		print(f"[DEBUG] Unexpected error in extract_icon_phash for package {apk_obj.get_package()}: {e}")
		return None

def extract_signatures(apk_obj):
	try:
		certs = apk_obj.get_certificates()
		if not certs:
			return [], [], None
		# Leaf cert is the first
		leaf_cert = certs[0]
		issuer = leaf_cert.issuer.human_friendly if hasattr(leaf_cert.issuer, 'human_friendly') else str(leaf_cert.issuer)
		sha256 = leaf_cert.sha256_fingerprint.replace(':', '').upper()
		# Full chain (all certs)
		chain = [c.sha256_fingerprint.replace(':', '').upper() for c in certs]
		return issuer, chain, sha256
	except Exception:
		return None, [], None

def process_apk(apk_path):
	try:
		apk = APK(apk_path)
		if not apk.is_valid_APK():
			raise ValueError('Invalid APK')
		package = apk.get_package()
		version_code = apk.get_androidversion_code()
		version_name = apk.get_androidversion_name()
		issuer, chain, sha256 = extract_signatures(apk)
		icon_phash = extract_icon_phash(apk)
		ingested_at = datetime.utcnow().isoformat() + 'Z'
		return package, {
			"publisher": issuer or "",
			"official_signatures": [f"SHA256:{sha256}"] if sha256 else [],
			"canonical_icon_phash": icon_phash or "",
			"ingested_at": ingested_at
		}
	except Exception as e:
		print(f"[ERROR] Failed to process {apk_path}: {e}")
		traceback.print_exc()
		return None, None

def main():
	registry = {}
	for fname in os.listdir(REFERENCE_APK_DIR):
		if not fname.lower().endswith('.apk'):
			continue
		apk_path = os.path.join(REFERENCE_APK_DIR, fname)
		package, entry = process_apk(apk_path)
		if package and entry:
			registry[package] = entry
	# Output to file and stdout
	with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
		json.dump(registry, f, indent=2, ensure_ascii=False)
	print(json.dumps(registry, indent=2, ensure_ascii=False))

if __name__ == "__main__":
	main()
