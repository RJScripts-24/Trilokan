import os
import json

VERSION_FILE = "models/version_info.json"

def get_deployed_version():
    """
    Returns the current version signature of the deployed AI models.
    """
    if os.path.exists(VERSION_FILE):
        with open(VERSION_FILE, 'r') as f:
            return json.load(f)
    return {"version": "0.0.0", "status": "UNKNOWN"}

def check_health():
    """
    Basic self-check for the deployment environment.
    """
    checks = {
        "api": "UP",
        "models": "UNKNOWN",
        "disk_space": "OK"
    }
    
    # Check if weights folder is populated
    if os.path.exists("models/weights") and os.listdir("models/weights"):
        checks["models"] = "LOADED"
    else:
        checks["models"] = "MISSING_WEIGHTS"
        
    return checks