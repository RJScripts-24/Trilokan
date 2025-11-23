# Identity Verifier: Modular Architecture

## Top-level Structure

- `ingest/` — Frame/audio/document capture & preprocessing
- `features/` — Feature-extraction functions for each signal
- `models/` — Trained model loading, inference wrappers, and fusion scorer
- `pipeline/` — Orchestration code for running signals and producing final decision JSON
- `challenges/` — Challenge-response manager (prompts, validation)
- `data/` — Labeled datasets, calibration stats, and sample test vectors (no real PII)
- `training/` — Scripts to train/calibrate the fusion model and classifiers
- `evaluation/` — Benchmarking, metrics, and bias tests
- `ops/` — Logging, alerts, model registry, monitoring hooks
- `docs/` — Spec, API contracts, threat model, privacy & retention policy

## Module Responsibilities

See `docs/` for detailed module-by-module responsibilities and implementation notes.

## Quick Start

1. Implement ingestion + face detection + basic per-frame sharpness and embedding extraction in `ingest/` and `features/`.
2. Build Stage 1 pipeline in `pipeline/`.
3. Add challenge-response manager in `challenges/`.
4. Expand features, models, and orchestration as described in the architecture plan.

---

For full details, see the architecture and implementation plan in `docs/`.
