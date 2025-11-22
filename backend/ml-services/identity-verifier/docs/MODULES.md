# Module-by-Module Responsibilities

## ingest/
- Video/audio/document capture & preprocessing
- Face detection/tracking, VAD, EXIF extraction
- Metadata collection
- Output: `ProcessedCapture` object

## features/
- Feature extraction for all signals
- Each function returns `{value, confidence, debug}`
- Includes normalization utilities

## models/
- Model loading, inference wrappers, fusion scorer
- Consistent API: `.load()`, `.infer()`
- Calibration utilities, fallback policy engine

## pipeline/
- Orchestration of feature extraction and model inference
- Two-stage checks (fast, then expensive)
- Returns `VerificationResult` JSON

## challenges/
- Challenge-response manager
- Prompt generation, validation routines
- Latency/retry logic

## data/
- Labeled datasets, calibration stats, sample test vectors
- No real PII

## training/
- Feature extraction for datasets
- Model training/calibration scripts
- Versioned artifacts

## evaluation/
- Unit/benchmark/ablation/red-team tests
- Metrics and bias analysis

## ops/
- Logging, alerts, model registry, monitoring hooks
- Audit logs, retention policy, explainable output

## docs/
- Spec, API contracts, threat model, privacy & retention policy
