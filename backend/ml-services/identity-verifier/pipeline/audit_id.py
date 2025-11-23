import uuid
import time
import os
import datetime
from typing import Dict, Tuple, Any

# Configuration for temporary evidence storage
# In production, this might be an S3 bucket path (e.g., "s3://trustguard-evidence/")
STORAGE_BASE_PATH = "temp_storage/evidence"

def generate_audit_id(prefix: str = "REQ") -> str:
    """
    Generates a unique, time-ordered identifier for a verification request.
    
    Format: PREFIX-YYYYMMDD-HHMMSS-UUID
    Example: REQ-20251123-143001-a1b2c3d4
    
    This format allows for easy chronological sorting of logs even without 
    parsing timestamps.
    """
    now = datetime.datetime.utcnow()
    timestamp_str = now.strftime("%Y%m%d-%H%M%S")
    
    # Short UUID (first 8 chars) is usually sufficient for daily collision avoidance
    # in moderate traffic, but we use full UUID for safety if needed.
    unique_suffix = str(uuid.uuid4())[:8]
    
    return f"{prefix}-{timestamp_str}-{unique_suffix}"

def get_evidence_path(audit_id: str, file_type: str = "video") -> str:
    """
    Generates a secure, predictable path for storing the raw evidence.
    
    Args:
        audit_id (str): The unique transaction ID.
        file_type (str): 'video', 'audio', or 'report'.

    Returns:
        str: Relative path to save the file.
    """
    # Create directory structure based on date to avoid millions of files in one folder
    # Extract date from ID (REQ-20251123-...)
    try:
        parts = audit_id.split('-')
        date_part = parts[1] # 20251123
    except IndexError:
        # Fallback if ID format changes
        date_part = datetime.datetime.utcnow().strftime("%Y%m%d")

    # Structure: evidence/20251123/REQ-....mp4
    directory = os.path.join(STORAGE_BASE_PATH, date_part)
    
    # Ensure directory exists (mkdir -p)
    os.makedirs(directory, exist_ok=True)
    
    extension = "json"
    if file_type == 'video': extension = "mp4"
    elif file_type == 'audio': extension = "wav"
    elif file_type == 'image': extension = "jpg"
    
    filename = f"{audit_id}.{extension}"
    return os.path.join(directory, filename)

def create_audit_record(user_id: str, action: str, client_ip: str) -> Dict[str, Any]:
    """
    Initializes a structured audit record object.
    
    Args:
        user_id (str): The user claiming identity.
        action (str): The activity (e.g., 'high_value_transfer').
        client_ip (str): Source IP.

    Returns:
        dict: The initial audit log entry.
    """
    audit_id = generate_audit_id()
    
    return {
        'audit_id': audit_id,
        'user_id': user_id,
        'action': action,
        'client_ip': client_ip,
        'start_time_utc': datetime.datetime.utcnow().isoformat(),
        'status': 'INITIATED',
        'storage_refs': {
            'video': get_evidence_path(audit_id, 'video'),
            'report': get_evidence_path(audit_id, 'report')
        }
    }

if __name__ == "__main__":
    # Test
    uid = generate_audit_id()
    print(f"Generated ID: {uid}")
    print(f"Storage Path: {get_evidence_path(uid, 'video')}")