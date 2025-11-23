import unittest
import os
import sys
import io
import json
from unittest.mock import patch, MagicMock

# --- Add the parent directory to the Python path ---
# This allows us to import the 'app' module from the parent directory
script_dir = os.path.dirname(__file__)
parent_dir = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.insert(0, parent_dir)

# Now we can import our Flask app
import app as flask_app

class TestAPI(unittest.TestCase):

    def setUp(self):
        """Set up the Flask test client and dummy file data."""
        flask_app.app.config['TESTING'] = True
        self.client = flask_app.app.test_client()
        
        # Create dummy file-like objects using io.BytesIO
        # The tuple format (data, filename) is what the test client expects
        self.dummy_video = (io.BytesIO(b"dummy video data"), 'test.mp4')
        self.dummy_audio = (io.BytesIO(b"dummy audio data"), 'test.wav')
        self.dummy_document = (io.BytesIO(b"dummy document data"), 'test.png')

    @patch('app.face_processor.analyze_face')
    @patch('app.voice_processor.analyze_voice')
    @patch('app.doc_processor.analyze_document')
    @patch('os.makedirs', MagicMock()) # Mock os.makedirs to do nothing
    @patch('os.remove') # We want to test that os.remove is called
    def test_verify_success_all_pass(self, mock_os_remove, mock_doc, mock_voice, mock_face):
        """
        Test the /verify endpoint with valid files where all checks pass.
        """
        # --- Mock Setup ---
        # Define what our (mocked) processors will return
        mock_face.return_value = {'status': 'success', 'overall_pass': True, 'check': 'face_ok'}
        mock_voice.return_value = {'status': 'success', 'overall_pass': True, 'check': 'voice_ok'}
        mock_doc.return_value = {'status': 'success', 'overall_pass': True, 'check': 'doc_ok'}

        # --- Action ---
        # Send the POST request
        data = {
            'video': self.dummy_video,
            'audio': self.dummy_audio,
            'document': self.dummy_document
        }
        response = self.client.post('/verify', data=data, content_type='multipart/form-data')

        # --- Assertions ---
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()
        
        self.assertEqual(json_data['overall_status'], 'success')
        self.assertTrue(json_data['overall_pass'])
        
        # Check that the results from the mocks are in the response
        self.assertEqual(json_data['face_results']['check'], 'face_ok')
        self.assertEqual(json_data['voice_results']['check'], 'voice_ok')
        self.assertEqual(json_data['document_results']['check'], 'doc_ok')
        
        # Check that our file cleanup was called (3 files)
        self.assertEqual(mock_os_remove.call_count, 3)

    @patch('app.face_processor.analyze_face')
    @patch('app.voice_processor.analyze_voice')
    @patch('app.doc_processor.analyze_document')
    @patch('os.makedirs', MagicMock())
    @patch('os.remove')
    def test_verify_success_one_fail(self, mock_os_remove, mock_doc, mock_voice, mock_face):
        """
        Test the /verify endpoint where the API call is successful,
        but one of the logical checks (e.g., voice) fails.
        """
        # --- Mock Setup ---
        mock_face.return_value = {'status': 'success', 'overall_pass': True, 'check': 'face_ok'}
        mock_voice.return_value = {'status': 'success', 'overall_pass': False, 'check': 'voice_fail'} # <--- The Failure
        mock_doc.return_value = {'status': 'success', 'overall_pass': True, 'check': 'doc_ok'}

        # --- Action ---
        data = {
            'video': self.dummy_video,
            'audio': self.dummy_audio,
            'document': self.dummy_document
        }
        response = self.client.post('/verify', data=data, content_type='multipart/form-data')

        # --- Assertions ---
        self.assertEqual(response.status_code, 200) # The API call itself was a success
        json_data = response.get_json()
        
        self.assertEqual(json_data['overall_status'], 'success')
        self.assertFalse(json_data['overall_pass']) # But the overall *verification* failed
        self.assertEqual(json_data['voice_results']['check'], 'voice_fail')
        self.assertEqual(mock_os_remove.call_count, 3) # Cleanup still happens

    def test_verify_missing_file(self):
        """
        Test the /verify endpoint when a required file is missing.
        """
        # --- Action ---
        # Send the POST request with only the video file
        data = {
            'video': self.dummy_video,
        }
        response = self.client.post('/verify', data=data, content_type='multipart/form-data')

        # --- Assertions ---
        self.assertEqual(response.status_code, 400)
        json_data = response.get_json()
        self.assertEqual(json_data['status'], 'error')
        self.assertIn('Missing file part: audio', json_data['message'])

    @patch('app.face_processor.analyze_face')
    @patch('os.makedirs', MagicMock())
    @patch('os.remove')
    def test_verify_processor_exception(self, mock_os_remove, mock_face):
        """
        Test the /verify endpoint's error handling when a processor fails
        with an unexpected exception.
        """
        # --- Mock Setup ---
        # Simulate the face processor raising an internal error
        mock_face.side_effect = Exception("Internal CV Error")

        # --- Action ---
        data = {
            'video': self.dummy_video,
            'audio': self.dummy_audio,
            'document': self.dummy_document
        }
        response = self.client.post('/verify', data=data, content_type='multipart/form-data')

        # --- Assertions ---
        self.assertEqual(response.status_code, 500)
        json_data = response.get_json()
        self.assertEqual(json_data['status'], 'error')
        self.assertIn('Internal server error', json_data['message'])
        
        # CRITICAL: Check that cleanup still happened even after an error
        # This tests the 'finally' block in app.py
        self.assertEqual(mock_os_remove.call_count, 3)

if __name__ == '__main__':
    unittest.main()