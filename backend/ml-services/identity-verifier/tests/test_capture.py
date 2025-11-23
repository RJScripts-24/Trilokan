"""
Unit tests for ingest/capture.py: frame/audio extraction and normalization.
"""
import unittest
from ingest import capture

class TestCapture(unittest.TestCase):
    def test_capture_from_file_stub(self):
        # Should return ProcessedCapture with empty data for a non-existent file
        result = capture.capture_from_file('dummy.mp4')
        self.assertIsNotNone(result)
        self.assertEqual(len(result.frames), 0)

    @unittest.skip("Stream ingestion not implemented yet.")
    def test_capture_from_stream_stub(self):
        pass

if __name__ == '__main__':
    unittest.main()
