import logging
import json
import os
from typing import Dict, Any

class TrustAuditor:
    def __init__(self, audit_log_path: str = "logs/audit_trail.jsonl"):
        """
        Manages secure audit logging.
        
        Args:
            audit_log_path (str): Path to the append-only audit log.
        """
        self.audit_log_path = audit_log_path
        os.makedirs(os.path.dirname(audit_log_path), exist_ok=True)
        self.logger = logging.getLogger("TrustAuditor")

    def log_verification(self, result: Dict[str, Any]):
        """
        Writes a finalized verification record to the audit trail.
        
        Args:
            result (dict): The final output from the Orchestrator.
        """
        # We strictly define what goes into the permanent audit log
        # to avoid logging huge raw data dumps.
        entry = {
            "audit_id": result.get('audit_id'),
            "timestamp": result.get('timestamp'),
            "user_id": result.get('signals_summary', {}).get('user_id', 'unknown'),
            "decision": result.get('decision'),
            "risk_score": result.get('score'),
            "top_reasons": result.get('reasons', []),
            "latency_ms": result.get('latency_ms'),
            "signals_snapshot": self._sanitize_signals(result.get('signals_summary', {}))
        }

        try:
            with open(self.audit_log_path, 'a') as f:
                f.write(json.dumps(entry) + "\n")
            
            self.logger.info(f"Audit record written for {entry['audit_id']}", 
                             extra={'extra_tags': {'audit_id': entry['audit_id']}})
            return entry['audit_id']
            
        except Exception as e:
            self.logger.critical(f"Failed to write audit log! {e}")
            return None

    def _sanitize_signals(self, signals: Dict[str, Any]) -> Dict[str, float]:
        """
        Removes large binary data or sensitive PII from the signals dump.
        Keeps only the numerical risk metrics.
        """
        clean = {}
        for k, v in signals.items():
            if isinstance(v, (int, float, bool, str)) and len(str(v)) < 200:
                clean[k] = v
        return clean

# Singleton
_auditor = None
def get_auditor():
    global _auditor
    if _auditor is None:
        _auditor = TrustAuditor()
    return _auditor