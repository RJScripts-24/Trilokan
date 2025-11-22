# Identity Verifier: Architecture & Module Responsibilities

## 1. Ingest Layer (`ingest/`)
- **Purpose:** Accept raw inputs and normalize for the system.
- **Implements:**
  - Video/audio/document capture handlers
  - Face detection/tracking, VAD, EXIF extraction
  - Metadata collection
- **Output:** `ProcessedCapture` object

## 2. Feature Extraction (`features/`)
- **Purpose:** Compute engineered signals for fusion model.
- **Functions:**
  - `compute_sharpness`, `compute_dct_highfreq`, `compute_embedding`, `compute_optical_flow`, etc.
- **Returns:** `{value: float, confidence: float, debug: optional}`

## 3. Models & Fusion (`models/`)
- **Purpose:** Model loading, inference wrappers, fusion scorer.
- **Implements:**
  - Model wrappers: `.load()`, `.infer()`
  - Fusion scorer: returns `fused_score`, `decision`, `explain`
  - Calibration utilities, fallback policy engine

## 4. Pipeline Orchestration (`pipeline/`)
- **Purpose:** Stage signals, coordinate checks, produce final JSON.
- **Implements:**
  - Stage 1: fast checks
  - Stage 2: expensive checks if needed
  - `assess_verification(ProcessedCapture, policy_config)`

## 5. Challenges (`challenges/`)
- **Purpose:** Challenge generation, UI prompts, validation.
- **Implements:**
  - Prompt generator
  - Validation routines (head turn, blink, phrase)
  - Latency/retry logic

## 6. Training & Calibration (`training/`)
- **Purpose:** Feature dataset creation, model training, calibration.
- **Implements:**
  - Feature extraction scripts
  - Model training/calibration scripts
  - Versioned artifacts

## 7. Evaluation (`evaluation/`)
- **Purpose:** Tests, metrics, bias analysis.
- **Implements:**
  - Unit/benchmark/ablation/red-team tests

## 8. Logging & Explainability (`ops/`)
- **Purpose:** Observability, human-review support.
- **Implements:**
  - Audit logs, retention policy, explainable output

## 9. Security, Privacy & Data Handling
- **Implements:**
  - Hashing/encryption, retention, access control, audit trail

---

See the main architecture prompt for detailed implementation notes, data pipeline, and prioritized checklist.
