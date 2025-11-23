"""
Pipeline Package
----------------
This package manages the end-to-end verification workflow for the 'TrustGuard' system.

It coordinates:
1. Fast Checks (Stage 1): Metadata, Blocklists, Quality.
2. Heavy Checks (Stage 2): Deepfake CNN, ASV, Liveness.
3. Decision Logic: Fusion Scoring and Policy Enforcement.
4. Governance: Audit Logging and Timeouts.

Usage:
    from pipeline import VerificationOrchestrator
    orchestrator = VerificationOrchestrator(config={...})
    result = orchestrator.assess_verification(capture_data)
"""

# Expose the main controller
from .orchestrator import VerificationOrchestrator

# Expose exception handling for timeouts
from .timeouts import VerificationTimeout, TimeoutConfig

# Expose audit utilities
from .audit_id import generate_audit_id

# Expose individual stages (useful for unit testing specific checks)
from .stage1 import run_stage1
from .stage2 import run_stage2

__all__ = [
    "VerificationOrchestrator",
    "VerificationTimeout",
    "TimeoutConfig",
    "generate_audit_id",
    "run_stage1",
    "run_stage2"
]