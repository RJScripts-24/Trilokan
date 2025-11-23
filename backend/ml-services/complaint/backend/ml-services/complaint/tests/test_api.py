# tests/test_api.py

import unittest
import sys
import os

# Ensure project root is importable
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app import app
from unittest.mock import patch, AsyncMock

client = TestClient(app)


class TestAPIEndpoints(unittest.TestCase):

    # ---------------------------------------------------------
    # Root & Metadata
    # ---------------------------------------------------------
    def test_root_metadata(self):
        response = client.get("/api/v1/")
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertIn("service", data)
        self.assertIn("status", data)
        self.assertIn("version", data)
        self.assertEqual(data["status"], "active")

    # ---------------------------------------------------------
    # Categorize Endpoint
    # ---------------------------------------------------------
    @patch("api.routes.categorize_text")
    def test_categorize_endpoint_success(self, mock_categorize):
        """Test /categorize with mocked NLP"""

        mock_categorize.return_value = {
            "category": "fraud",
            "priority": "high",
            "confidence": 0.99
        }

        payload = {"text": "I lost money in a scam."}
        res = client.post("/api/v1/categorize", json=payload)

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data["data"]["category"], "fraud")

    def test_categorize_missing_text(self):
        """Test missing required field -> FastAPI returns 422 by default"""
        res = client.post("/api/v1/categorize", json={})
        # FastAPI/Pydantic returns 422 for missing required fields
        self.assertEqual(res.status_code, 422)

    @patch("api.routes.categorize_text")
    def test_categorize_internal_error(self, mock_categorize):
        """Simulate NLP failure"""
        # Make the categorize_text used by routes raise an exception
        mock_categorize.side_effect = Exception("boom")

        payload = {"text": "valid text"}
        res = client.post("/api/v1/categorize", json=payload)

        # App's global exception handler should convert to 500
        self.assertEqual(res.status_code, 500)

    # ---------------------------------------------------------
    # Complaint Create / Get / List — patch the functions that api.routes calls
    # ---------------------------------------------------------

    @patch("api.routes.create_complaint_db")
    @patch("api.routes.categorize_text")
    def test_create_complaint_success(self, mock_cat, mock_db):
        # mock NLP triage
        mock_cat.return_value = {
            "category": "fraud",
            "priority": "high",
            "confidence": 0.88
        }

        # create_complaint_db is awaited in the route; patch becomes an AsyncMock automatically
        # Ensure it returns a dict that will be JSON-serializable
        mock_db.return_value = {
            "id": "123",
            "user_id": "u1",
            "title": "Fake app",
            "description": "App stole my money",
            "channel": "web",
            "attachments": [],
            "category": "fraud",
            "entities": {},
            "status": "new"
        }

        payload = {
            "title": "Fake app",
            "description": "App stole my money",
            "user_id": "u1",
            "attachments": []
        }

        res = client.post("/api/v1/complaints", json=payload)

        self.assertEqual(res.status_code, 201)
        data = res.json()
        # route returns whatever create_complaint_db returned (or a Pydantic model) — assert on keys
        self.assertEqual(data["id"], "123")
        self.assertEqual(data["category"], "fraud")

    @patch("api.routes.get_complaint_db")
    def test_get_complaint_not_found(self, mock_get):
        # Return None to simulate not-found
        mock_get.return_value = None

        res = client.get("/api/v1/complaints/invalid-id")
        self.assertEqual(res.status_code, 404)

    @patch("api.routes.list_complaints_db")
    def test_list_complaints(self, mock_list):
        # Return an empty list
        mock_list.return_value = []

        res = client.get("/api/v1/complaints")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])


if __name__ == "__main__":
    unittest.main()
