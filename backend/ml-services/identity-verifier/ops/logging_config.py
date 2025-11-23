import logging
import json
import sys
import os
from datetime import datetime

class JsonFormatter(logging.Formatter):
    """
    Formats log records as JSON objects for machine readability.
    Phase 2: Enhanced with audit_id, scores, and verification metadata.
    """
    def format(self, record):
        log_record = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "func": record.funcName,
            "line": record.lineno
        }
        
        # Phase 2: Add verification-specific fields
        if hasattr(record, 'audit_id'):
            log_record['audit_id'] = record.audit_id
        
        if hasattr(record, 'video_fake_prob'):
            log_record['video_fake_prob'] = record.video_fake_prob
        
        if hasattr(record, 'final_score'):
            log_record['final_score'] = record.final_score
        
        if hasattr(record, 'policy_decision'):
            log_record['policy_decision'] = record.policy_decision
        
        if hasattr(record, 'risk_category'):
            log_record['risk_category'] = record.risk_category
        
        if hasattr(record, 'user_id'):
            log_record['user_id'] = record.user_id
        
        if hasattr(record, 'processing_ms'):
            log_record['processing_ms'] = record.processing_ms
        
        # Add exception info if present
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
            
        # Merge extra fields passed in logging calls
        if hasattr(record, 'extra_tags'):
            log_record.update(record.extra_tags)

        return json.dumps(log_record)

def configure_logging(log_level=logging.INFO, log_dir="logs"):
    """
    Configures the root logger with JSON formatting.
    Phase 2: Enhanced for verification pipeline logging.
    """
    os.makedirs(log_dir, exist_ok=True)
    
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # clear existing handlers
    root_logger.handlers = []

    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(JsonFormatter())
    root_logger.addHandler(console_handler)

    # File Handler
    file_path = os.path.join(log_dir, f"trustguard_{datetime.utcnow().strftime('%Y%m%d')}.log")
    file_handler = logging.FileHandler(file_path)
    file_handler.setFormatter(JsonFormatter())
    root_logger.addHandler(file_handler)

    logging.info(f"Logging configured. Writing to {file_path}")


# Alias for backward compatibility
def setup_logging(log_level=logging.INFO, log_dir="logs"):
    """Alias for configure_logging."""
    return configure_logging(log_level, log_dir)