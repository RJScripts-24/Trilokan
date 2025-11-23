import json
import random
import uuid
import os
from typing import Dict, Any

class ChallengeGenerator:
    def __init__(self, templates_path: str = None):
        """
        Generates random liveness challenges (Movement or Speech).
        """
        if templates_path is None:
            # Default to json in same folder
            templates_path = os.path.join(os.path.dirname(__file__), 'challenge_templates.json')
            
        self.templates = self._load_templates(templates_path)

    def _load_templates(self, path: str) -> Dict[str, Any]:
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading challenge templates: {e}")
            return {"movements": [], "phrases": []}

    def generate_challenge(self, challenge_type: str = "random") -> Dict[str, Any]:
        """
        Creates a new challenge session.
        
        Args:
            challenge_type (str): 'movement', 'audio', or 'random'.

        Returns:
            dict: {
                'challenge_id': str,
                'type': str,
                'prompt': str,
                'expected': dict (internal logic params)
            }
        """
        c_id = str(uuid.uuid4())
        
        # Decide type
        if challenge_type == "random":
            challenge_type = random.choice(["movement", "audio"])

        if challenge_type == "movement" and self.templates.get('movements'):
            # Pick a random movement
            template = random.choice(self.templates['movements'])
            return {
                'challenge_id': c_id,
                'type': 'movement',
                'prompt': template['prompt'],
                'expected': {
                    'signal': template['expected_signal'],
                    'target': template['target_value'],
                    'op': template['operator']
                }
            }
            
        elif challenge_type == "audio" and self.templates.get('phrases'):
            # Pick a random phrase
            phrase = random.choice(self.templates['phrases'])
            # Append a random number to prevent easy audio splicing
            suffix = str(random.randint(100, 999))
            full_phrase = f"{phrase} {suffix}"
            
            return {
                'challenge_id': c_id,
                'type': 'audio',
                'prompt': f"Say the phrase: '{full_phrase}'",
                'expected': {
                    'text': full_phrase
                }
            }
        
        else:
            # Fallback
            return {
                'challenge_id': c_id,
                'type': 'none',
                'prompt': 'Look at the camera',
                'expected': {}
            }

# Singleton
_gen_instance = None
def get_challenge_generator():
    global _gen_instance
    if _gen_instance is None:
        _gen_instance = ChallengeGenerator()
    return _gen_instance