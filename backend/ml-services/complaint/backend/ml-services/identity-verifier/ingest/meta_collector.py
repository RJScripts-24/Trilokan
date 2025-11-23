"""
meta_collector.py
Purpose: Collect device/IP/user-agent metadata.
"""
from datetime import datetime

def collect_meta(request):
    """
    Collect metadata from a web request (device info, IP, user-agent, upload timestamp).
    Args:
        request: Web framework request object (Flask, FastAPI, etc.)
    Returns:
        dict: Metadata dictionary
    """
    meta = {}
    # IP address (try X-Forwarded-For first for proxies)
    ip = request.headers.get('X-Forwarded-For', request.remote_addr if hasattr(request, 'remote_addr') else None)
    if ip and ',' in ip:
        ip = ip.split(',')[0].strip()
    meta['ip'] = ip
    # User-Agent
    meta['user_agent'] = request.headers.get('User-Agent', None)
    # Device info (if sent by client)
    meta['device_id'] = request.headers.get('X-Device-Id', None)
    meta['device_type'] = request.headers.get('X-Device-Type', None)
    # Upload timestamp (UTC ISO8601)
    meta['upload_time'] = datetime.utcnow().isoformat() + 'Z'
    # Any additional custom headers
    meta['custom'] = {k: v for k, v in request.headers.items() if k.lower().startswith('x-custom-')}
    return meta
