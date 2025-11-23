# Audit Policy

This document describes the retention, access control, and redaction rules for audit data in the Identity Verifier service.

## Data Retention
- **Default Retention Period:** 90 days
- **Extension:** Retention may be extended for ongoing investigations, with documented approval.
- **Deletion:** Data is automatically deleted after the retention period unless extended.

## Access Control
- **Role-Based Access:** Only authorized personnel (auditors, admins) can access audit logs.
- **Authentication:** All access requires strong authentication (MFA recommended).
- **Logging:** All access to audit data is logged and regularly reviewed.

## Redaction Rules
- **PII Redaction:** Personally Identifiable Information (PII) is redacted in audit logs unless required for investigation.
- **On-Request Redaction:** Users may request redaction of their PII, subject to legal and compliance requirements.

## Review and Updates
- **Policy Review:** This policy is reviewed annually or after any major incident.
- **Change Log:** All changes to this policy are documented in the version history section below.

---
**Version History**
- v1.0 (2025-11-23): Initial version.
