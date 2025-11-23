import unittest
import os
import sys
import numpy as np
from unittest.mock import patch, MagicMock, ANY

# --- Add the parent directory to the Python path ---
# This allows us to import modules from the 'modules' folder
# (e.g., `from modules.face_processor import analyze_face`)
# This is a common pattern for testing in Python.
# We go up two levels: _tests_ -> identity-verifier -> ml-services
# and then add 'ml-services/identity-verifier'
script_dir = os.path.dirname(__file__)
parent_dir = os.path.abspath(os.path.join(script_dir, '..'))
sys.path.insert(0, parent_dir)
# Now we can import our module
from modules import face_processor

class TestFaceProcessor(unittest.TestCase):
    
    def setUp(self):
        """Set up a dummy video frame for mocks to return."""
        self.dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        self.dummy_gray_frame = np.zeros((480, 640), dtype=np.uint8)
        
        # A mock face region (x, y, w, h)
        self.mock_face_rect = [(100, 100, 200, 200)]
        # A mock eye region
        self.mock_eye_rect = [(50, 50, 50, 50)]

    @patch('modules.face_processor.cv2.VideoCapture')
    @patch('modules.face_processor.FACE_CASCADE.detectMultiScale')
    @patch('modules.face_processor.EYE_CASCADE.detectMultiScale')
    @patch('modules.face_processor.cv2.cvtColor', MagicMock(return_value=None)) # Not testing color conversion
    @patch('modules.face_processor.cv2.Laplacian')
    def test_successful_analysis(self, mock_laplacian, mock_eye_cascade, mock_face_cascade, mock_videocapture):
        """
        Tests a "perfect" video: face found, blinks detected, video is sharp.
        """
        # --- Mock Setup ---
        # 1. Mock VideoCapture to return a "video" with 20 frames
        mock_cap_instance = mock_videocapture.return_value
        mock_cap_instance.isOpened.return_value = True
        # (True, frame) for 20 frames, then (False, None) to stop
        mock_cap_instance.read.side_effect = [(True, self.dummy_frame)] * 20 + [(False, None)]

        # 2. Mock Face/Eye Cascades
        mock_face_cascade.return_value = self.mock_face_rect # Always find a face
        # Simulate a blink: Find eyes 10x, find no eyes (blink) 5x, find eyes 5x
        mock_eye_cascade.side_effect = [self.mock_eye_rect] * 10 + [[]] * 5 + [self.mock_eye_rect] * 5

        # 3. Mock Laplacian (Sharpness)
        # Mock the .var() method to return a high (sharp) score
        mock_laplacian.return_value.var.return_value = 200.0 # > BLUR_THRESHOLD (80.0)

        # --- Run Analysis ---
        result = face_processor.analyze_face('dummy/path.mp4')
        
        # --- Assertions ---
        self.assertEqual(result['status'], 'success')
        self.assertTrue(result['overall_pass'])
        self.assertTrue(result['liveness_check']['passed'])
        self.assertTrue(result['deepfake_check (heuristic)']['passed'])
        self.assertEqual(result['liveness_check']['blinks_detected'], 1)
        self.assertAlmostEqual(result['deepfake_check (heuristic)']['sharpness_score'], 200.0)

    @patch('modules.face_processor.cv2.VideoCapture')
    @patch('modules.face_processor.FACE_CASCADE.detectMultiScale')
    @patch('modules.face_processor.EYE_CASCADE.detectMultiScale')
    @patch('modules.face_processor.cv2.cvtColor', MagicMock(return_value=None))
    @patch('modules.face_processor.cv2.Laplacian')
    def test_fail_liveness_no_blink(self, mock_laplacian, mock_eye_cascade, mock_face_cascade, mock_videocapture):
        """
        Tests a "fake" video (e.g., a photo): face found, but no blinks.
        """
        # --- Mock Setup ---
        mock_cap_instance = mock_videocapture.return_value
        mock_cap_instance.isOpened.return_value = True
        mock_cap_instance.read.side_effect = [(True, self.dummy_frame)] * 20 + [(False, None)]
        
        mock_face_cascade.return_value = self.mock_face_rect # Always find a face
        mock_eye_cascade.return_value = self.mock_eye_rect # ALWAYS find eyes (no blinks)
        
        mock_laplacian.return_value.var.return_value = 200.0 # Video is sharp
        
        # --- Run Analysis ---
        result = face_processor.analyze_face('dummy/path.mp4')
        
        # --- Assertions ---
        self.assertEqual(result['status'], 'success') # Analysis finished
        self.assertFalse(result['overall_pass']) # But overall check failed
        self.assertFalse(result['liveness_check']['passed'])
        self.assertTrue(result['deepfake_check (heuristic)']['passed']) # Sharpness was fine
        self.assertEqual(result['liveness_check']['blinks_detected'], 0)

    @patch('modules.face_processor.cv2.VideoCapture')
    @patch('modules.face_processor.FACE_CASCADE.detectMultiScale')
    @patch('modules.face_processor.EYE_CASCADE.detectMultiScale')
    @patch('modules.face_processor.cv2.cvtColor', MagicMock(return_value=None))
    @patch('modules.face_processor.cv2.Laplacian')
    def test_fail_deepfake_blur(self, mock_laplacian, mock_eye_cascade, mock_face_cascade, mock_videocapture):
        """
        Tests a "blurry" video: face found, blinks, but fails sharpness check.
        """
        # --- Mock Setup ---
        mock_cap_instance = mock_videocapture.return_value
        mock_cap_instance.isOpened.return_value = True
        mock_cap_instance.read.side_effect = [(True, self.dummy_frame)] * 20 + [(False, None)]
        
        mock_face_cascade.return_value = self.mock_face_rect
        mock_eye_cascade.side_effect = [self.mock_eye_rect] * 10 + [[]] * 5 + [self.mock_eye_rect] * 5 # Blink is fine
        
        mock_laplacian.return_value.var.return_value = 50.0 # VERY Blurry (< 80.0)

        # --- Run Analysis ---
        result = face_processor.analyze_face('dummy/path.mp4')
        
        # --- Assertions ---
        self.assertEqual(result['status'], 'success')
        self.assertFalse(result['overall_pass'])
        self.assertTrue(result['liveness_check']['passed']) # Liveness was fine
        self.assertFalse(result['deepfake_check (heuristic)']['passed'])
        self.assertAlmostEqual(result['deepfake_check (heuristic)']['sharpness_score'], 50.0)

    @patch('modules.face_processor.cv2.VideoCapture')
    @patch('modules.face_processor.FACE_CASCADE.detectMultiScale')
    @patch('modules.face_processor.cv2.cvtColor', MagicMock(return_value=None))
    def test_no_face_detected(self, mock_face_cascade, mock_videocapture):
        """
        Tests a video where no face is ever found.
        """
        # --- Mock Setup ---
        mock_cap_instance = mock_videocapture.return_value
        mock_cap_instance.isOpened.return_value = True
        mock_cap_instance.read.side_effect = [(True, self.dummy_frame)] * 20 + [(False, None)]
        
        mock_face_cascade.return_value = [] # Never find a face

        # --- Run Analysis ---
        result = face_processor.analyze_face('dummy/path.mp4')
        
        # --- Assertions ---
        self.assertEqual(result['status'], 'failed')
        self.assertFalse(result['overall_pass'])
        self.assertEqual(result['message'], 'No face detected in the video. Please try again.')

    @patch('modules.face_processor.cv2.VideoCapture')
    def test_invalid_file(self, mock_videocapture):
        """
        Tests what happens if cv2.VideoCapture can't open the file.
        """
        # --- Mock Setup ---
        mock_cap_instance = mock_videocapture.return_value
        mock_cap_instance.isOpened.return_value = False # Simulate file not opening

        # --- Run Analysis ---
        result = face_processor.analyze_face('dummy/bad_path.mp4')
        
        # --- Assertions ---
        self.assertEqual(result['status'], 'error')
        self.assertEqual(result['message'], 'Could not open video file.')


if __name__ == '__main__':
    unittest.main()