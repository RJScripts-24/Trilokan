# tests/test_nlp.py

import unittest
import sys
import os

# Ensure project root is importable
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules.nlp.analyze import categorize_text, extract_entities


class TestNLPModule(unittest.TestCase):

    def setUp(self):
        self.sample_text_fraud = (
            "I received a fake call asking for my OTP and lost 5000 rupees."
        )
        self.sample_text_general = (
            "What are your bank timings for the Mumbai branch?"
        )
        self.entity_text = (
            "Download myapp.apk from http://example.com or visit www.portal123.org"
        )

    # ---------------------------------------------------------
    # Categorization tests
    # ---------------------------------------------------------
    def test_categorize_fraud(self):
        result = categorize_text(self.sample_text_fraud)

        self.assertIsInstance(result, dict)
        self.assertIn("category", result)
        self.assertEqual(result["category"], "fraud")

        self.assertIn("priority", result)
        self.assertIn("confidence", result)
        self.assertGreaterEqual(result["confidence"], 0.0)
        self.assertLessEqual(result["confidence"], 1.0)

    def test_categorize_general(self):
        result = categorize_text(self.sample_text_general)

        self.assertIsInstance(result, dict)
        self.assertEqual(result["category"], "general")
        self.assertIn("priority", result)
        self.assertIn("confidence", result)

    # ---------------------------------------------------------
    # Entity extraction tests
    # ---------------------------------------------------------
    def test_extract_entities(self):
        entities = extract_entities(self.entity_text)

        self.assertIsInstance(entities, dict)

        # URLs
        self.assertIn("urls", entities)
        self.assertTrue(any("example.com" in url or "portal123.org" in url for url in entities["urls"]))

        # APK detection
        self.assertIn("apks", entities)
        self.assertTrue(any(apk.endswith(".apk") for apk in entities["apks"]))

        # App-like words
        self.assertIn("app_keywords", entities)
        self.assertGreaterEqual(len(entities["app_keywords"]), 1)

    def test_extract_entities_empty(self):
        entities = extract_entities("")

        self.assertEqual(entities["urls"], [])
        self.assertEqual(entities["apks"], [])
        self.assertEqual(entities["app_keywords"], [])


if __name__ == "__main__":
    unittest.main()
