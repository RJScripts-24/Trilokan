"""
Unit tests for ingest/capture.py: frame/audio extraction and normalization.
"""
import unittest
from ingest import capture

class TestCapture(unittest.TestCase):
    def test_capture_from_file_stub(self):
        # Should return None or raise NotImplementedError for now
        result = capture.capture_from_file('dummy_path')
        self.assertIsNone(result)

    def test_capture_from_stream_stub(self):
        result = capture.capture_from_stream(None)
        self.assertIsNone(result)

if __name__ == '__main__':
    unittest.main()
