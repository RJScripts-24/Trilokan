# App Detector

A multi-stage, explainable APK authenticity and fraud detection pipeline for digital finance apps.

## Usage

### Run detection on an APK

```sh
python -m app_detector detect_apk path/to/app.apk
```

- Use `--dry-run` for no side effects, `--verbose` for detailed output.

### Config
- Edit `config.py` to set:
  - `TARGET_BRANDS`, `OFFICIAL_PACKAGE_NAMES`, `OFFICIAL_SIGNATURES`, `OFFICIAL_HASHES`
  - `PERMISSION_WEIGHTS`, `ICON_SIMILARITY_THRESHOLD`, etc.
- Place official brand icons in the directory specified by `ICON_BRAND_DIR` (default: `brand_icons/`).

### Plugging in VirusTotal or Play Store enrichment
- By default, `reputation_enrichment` is a stub. To use a real API:
  - Set your API key: `export VT_API_KEY=...`
  - Implement the lookup in `reputation_enrichment`.

### Dynamic analysis (sandbox)
- The detector supports a `sandbox_results` dict for future dynamic analysis integration. Example schema:

```python
sandbox_results = {
  "network_domains": ["malicious.example.com"],
  "sensitive_api_calls": ["sendTextMessage", "getDeviceId"],
  "exfiltrated_fields": ["device_id", "contacts"],
  "runtime_signals": {"tries_to_install_apk": True}
}
```

### Testing

Run all tests with:

```sh
pytest tests/test_detector.py
```

## Privacy & Safety
- No user-uploaded APKs are auto-deleted; review and retention policy is manual.
- All logs and test fixtures must redact PII.
- Legal/takedown automation is not included; see code comments for extension points.

## References
- Implements pipeline per threat model in `Enhancing Trust in Digital Finance_ Tackling Fraud and Grievances.pdf`.
