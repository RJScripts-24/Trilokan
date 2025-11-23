"""
Unit test for challenge validation.
"""
import unittest
from challenges import challenge_validator

class TestChallengeValidator(unittest.TestCase):
    def test_validate_response(self):
        # Example test with dummy data
        validator = challenge_validator.ChallengeValidator()
        processed_capture = {'pose_history': [{'yaw': -25, 'pitch': 0, 'ear': 0.3}]}
        challenge = {'type': 'movement', 'expected': {'signal': 'head_yaw', 'target': -20, 'op': 'less_than'}}
        result = validator.validate_response(processed_capture, challenge)
        self.assertIsInstance(result, dict)
        self.assertIn('passed', result)

if __name__ == "__main__":
    unittest.main()
