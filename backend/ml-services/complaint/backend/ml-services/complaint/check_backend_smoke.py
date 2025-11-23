# check_backend_smoke.py
# Single-file smoke test for the Complaint Portal backend (no Postgres required).
# Usage:
#   .venv\Scripts\Activate.ps1   # (PowerShell) or source .venv/bin/activate (bash)
#   python check_backend_smoke.py

import json
import sys
import traceback
from fastapi.testclient import TestClient

# import the running app (this imports api.app_factory.create_app() via app.py)
from app import app

# import routes module to patch DB helpers
import api.routes as routes

client = TestClient(app)


# --- Fake async DB helpers (used to avoid real DB) ---
async def fake_create_complaint_db(db, data):
    # Return a JSON-serializable dict that mimics a persisted complaint
    return {
        "id": "fake-123",
        "user_id": data.get("user_id"),
        "title": data.get("title"),
        "description": data.get("description"),
        "priority": data.get("priority", "basic"),
        "channel": data.get("channel", "web"),
        "file_uploads": data.get("file_uploads", []),
        "status": data.get("status", "new"),
    }


async def fake_list_complaints_db(db, user_id=None, status=None):
    return []


def pretty_print(resp):
    try:
        content = resp.json()
    except Exception:
        content = resp.text
    print(f"Status: {resp.status_code}\nResponse: {json.dumps(content, indent=2, ensure_ascii=False)}\n")


def run_smoke_tests():
    print("\n--- Checking API root (/api/v1/) ---")
    try:
        r = client.get("/api/v1/")
        pretty_print(r)
    except Exception:
        print("Failed to GET /api/v1/:")
        traceback.print_exc()

    print("\n--- Checking health (/health) ---")
    try:
        r = client.get("/health")
        pretty_print(r)
    except Exception:
        print("Failed to GET /health:")
        traceback.print_exc()

    print("\n--- Complaint create (mocked DB) POST /api/v1/complaints ---")
    # Patch the DB helpers on the routes module so the route uses our fakes
    routes.create_complaint_db = fake_create_complaint_db
    routes.list_complaints_db = fake_list_complaints_db

    try:
        payload = {
            "title": "Fake app charged me",
            "description": "This app deducted 5000 from my account.",
            "priority": "critical",
            "user_id": "user_test",
            "file_uploads": []
        }
        r = client.post("/api/v1/complaints", json=payload)
        pretty_print(r)
    except Exception:
        print("Failed to POST /api/v1/complaints (mocked):")
        traceback.print_exc()

    print("\n--- Complaint list (mocked DB) GET /api/v1/complaints ---")
    try:
        r = client.get("/api/v1/complaints")
        pretty_print(r)
    except Exception:
        print("Failed to GET /api/v1/complaints (mocked):")
        traceback.print_exc()

    print("\n--- Smoke tests finished ---\n")


if __name__ == "__main__":
    run_smoke_tests()
