import os
from typing import Optional

class SecretsManager:
    def __init__(self):
        # In prod, this might connect to AWS Secrets Manager or HashiCorp Vault
        self._cache = {}

    def get_secret(self, key_name: str, default: Optional[str] = None) -> str:
        """
        Retrieves a secret from Environment Variables.
        """
        # Try env var first
        val = os.getenv(key_name)
        if val:
            return val
            
        # Fallback
        if default:
            return default
            
        raise ValueError(f"Secret '{key_name}' not found and no default provided.")

_secrets = SecretsManager()
def get_secret(key):
    return _secrets.get_secret(key)