# Privacy Policy

This document outlines consent flows and instructions for handling Personally Identifiable Information (PII) in the Identity Verifier service.

## Consent Flows
- **Explicit Consent:** Users must provide explicit consent before any data collection or processing.
- **Consent Record:** Consent is logged with timestamp and user identifier.
- **Withdrawal:** Users can withdraw consent at any time; data will be deleted unless required for compliance.

## PII Handling
- **Data Minimization:** Only collect data strictly necessary for verification.
- **Encryption:** All PII is encrypted at rest and in transit.
- **Access Control:** Access to PII is restricted to authorized personnel only.
- **Retention:** PII is retained only as long as necessary for verification and compliance.
- **Redaction:** Users may request redaction of their PII, subject to legal requirements.

## Face Frame Processing (Deepfake Detection)
- **Ephemeral Processing:** Face frames extracted during deepfake detection are processed **in-memory only** by default.
- **No Permanent Storage:** Frame data is NOT persisted to disk during normal operation. All processing occurs in RAM and is discarded after analysis.
- **Temporary Debug Storage:** If debugging is enabled, frames may be temporarily written to `temp_uploads/` for diagnostic purposes only. These files are:
  - Automatically deleted after processing completion
  - Stored for a maximum of 24 hours
  - Subject to same encryption and access controls as other PII
- **Consent Required:** Users must explicitly consent to video frame analysis as part of the verification process.
- **Processing Transparency:** Users are informed that their video will be analyzed for deepfake detection as part of the identity verification workflow.

## User Rights
- **Access:** Users can request access to their data.
- **Correction:** Users can request correction of inaccurate data.
- **Deletion:** Users can request deletion of their data, subject to compliance constraints.

---
**Version History**
- v1.0 (2025-11-23): Initial version.
