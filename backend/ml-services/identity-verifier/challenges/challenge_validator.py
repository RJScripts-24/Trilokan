import numpy as np
from typing import Dict, Any, List

class ChallengeValidator:
    def __init__(self):
        pass

    def validate_response(
        self, 
        processed_capture: Dict[str, Any], 
        challenge: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Checks if the user's video/audio satisfies the challenge requirements.

        Args:
            processed_capture: Data containing 'landmarks_seq', 'audio_transcript', etc.
            challenge: The dict returned by generate_challenge().

        Returns:
            dict: {'passed': bool, 'details': str, 'score': float}
        """
        c_type = challenge.get('type')
        expected = challenge.get('expected', {})
        
        if c_type == 'movement':
            return self._validate_movement(processed_capture, expected)
        elif c_type == 'audio':
            return self._validate_audio(processed_capture, expected)
        
        return {'passed': True, 'details': 'No active challenge'}

    def _validate_movement(self, capture, expected) -> Dict[str, Any]:
        """
        Validates head/facial movements based on landmarks history.
        """
        # We need the sequence of landmarks or head pose angles calculated in Stage 2
        # Assuming Stage 2 or a pre-processor added 'pose_history' to capture
        # Format: [{'yaw': 0, 'pitch': 0, 'ear': 0.3}, ...]
        pose_history = capture.get('pose_history', [])
        
        if not pose_history:
            return {'passed': False, 'details': 'No pose history available'}

        target_signal = expected.get('signal') # e.g., 'head_yaw'
        target_val = expected.get('target')    # e.g., -20
        op = expected.get('op')                # e.g., 'less_than'

        # signal mapping
        key_map = {
            'head_yaw': 'yaw',
            'head_pitch': 'pitch',
            'eye_aspect_ratio': 'ear',
            'mouth_aspect_ratio': 'mar'
        }
        data_key = key_map.get(target_signal)
        
        # Check if ANY frame in the sequence met the condition
        passed = False
        max_deviation = 0.0

        for frame_data in pose_history:
            val = frame_data.get(data_key, 0.0)
            
            if op == 'less_than':
                if val < target_val:
                    passed = True
            elif op == 'greater_than':
                if val > target_val:
                    passed = True
            
            # Track max deviation for scoring
            max_deviation = max(max_deviation, abs(val))

        if passed:
            return {'passed': True, 'details': f"Movement {target_signal} detected"}
        else:
            return {
                'passed': False, 
                'details': f"Failed to reach {target_signal} target {target_val}"
            }

    def _validate_audio(self, capture, expected) -> Dict[str, Any]:
        """
        Validates that the spoken text matches the prompt.
        """
        # Assuming an STT engine (like Whisper) ran in pipeline and put text in 'transcript'
        transcript = capture.get('transcript', "").lower()
        target_text = expected.get('text', "").lower()

        if not transcript:
            return {'passed': False, 'details': 'No speech detected'}

        # Fuzzy matching (simple containment or Levenshtein distance)
        # Using simple containment for prototype
        
        # Check if the unique suffix (number) is present
        # Target: "trust guard 123"
        
        if target_text in transcript:
             return {'passed': True, 'details': 'Passphrase matched perfectly'}
        
        # Allow partial match (e.g. 80% words match)
        target_words = set(target_text.split())
        trans_words = set(transcript.split())
        common = target_words.intersection(trans_words)
        
        match_ratio = len(common) / len(target_words) if target_words else 0
        
        if match_ratio > 0.7:
             return {'passed': True, 'details': f"Passphrase matched ({int(match_ratio*100)}%)"}
        
        return {
            'passed': False, 
            'details': f"Phrase mismatch. Heard: '{transcript}'"
        }