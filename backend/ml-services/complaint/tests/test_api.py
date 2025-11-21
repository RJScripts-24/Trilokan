import unittest
from unittest.mock import patch
import json
import sys
import os

# Add the parent directory to sys.path to allow importing app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the Flask app
from app import app

class TestAPIEndpoints(unittest.TestCase):

    def setUp(self):
        """
        Runs before each test. Creates a test client for the Flask app.
        """
        self.app = app.test_client()
        self.app.testing = True

    def test_health_check(self):
        """
        Test the /health endpoint.
        """
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {"status": "healthy"})

    @patch('app.categorize_complaint')
    def test_categorize_endpoint_success(self, mock_categorize):
        """
        Test valid POST request to /api/v1/categorize.
        """
        # Mock the return value of the logic function
        mock_categorize.return_value = {
            "category": "Fraud & Scams",
            "priority": "Critical",
            "keywords": ["scam", "money"],
            "confidence": 0.99
        }

        payload = {"text": "I lost money in a scam."}
        response = self.app.post(
            '/api/v1/categorize',
            data=json.dumps(payload),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json['success'])
        self.assertEqual(response.json['data']['category'], "Fraud & Scams")

    def test_categorize_endpoint_bad_request(self):
        """
        Test POST request to /api/v1/categorize with missing data.
        """
        payload = {} # Missing 'text'
        response = self.app.post(
            '/api/v1/categorize',
            data=json.dumps(payload),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json)

    @patch('app.get_bot_response')
    def test_chat_endpoint_success(self, mock_chat):
        """
        Test valid POST request to /api/v1/chat.
        """
        # Mock the chatbot response
        mock_chat.return_value = "Please provide your transaction ID."

        payload = {"message": "Help me", "user_id": "user123"}
        response = self.app.post(
            '/api/v1/chat',
            data=json.dumps(payload),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['response'], "Please provide your transaction ID.")
        
        # Verify the mock was called with correct arguments
        mock_chat.assert_called_with("Help me", "user123")

    @patch('app.categorize_complaint')
    def test_categorize_internal_error(self, mock_categorize):
        """
        Test how the API handles an exception in the logic layer.
        """
        # Simulate the logic layer crashing
        mock_categorize.side_effect = Exception("Database failure")

        payload = {"text": "valid text"}
        response = self.app.post(
            '/api/v1/categorize',
            data=json.dumps(payload),
            content_type='application/json'
        )

        # The API should catch the error and return 500, not crash
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json['error'], "Internal server error processing complaint")

if __name__ == '__main__':
    unittest.main()