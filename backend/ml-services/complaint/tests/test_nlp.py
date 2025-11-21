import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add the parent directory to sys.path to allow importing modules
# This ensures the test can find 'modules' regardless of where it's run from
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules import nlp

class TestNLPModule(unittest.TestCase):

    def setUp(self):
        """
        Runs before each test. We can prepare data here.
        """
        self.sample_text_fraud = "I received a fake call asking for my OTP and lost 5000 rupees."
        self.sample_text_general = "What are your bank timings for the Mumbai branch?"

    def test_extract_keywords_basic(self):
        """
        Test if the keyword extractor retrieves relevant nouns/verbs.
        """
        text = "The unauthorized transaction on my credit card was shocking."
        keywords = nlp.extract_keywords(text)
        
        # Check if important words are captured
        # Note: stop words like 'the', 'on', 'was' should be removed
        self.assertIn('transaction', keywords)
        self.assertIn('credit', keywords)
        self.assertNotIn('the', keywords)
        self.assertTrue(len(keywords) > 0)

    def test_extract_keywords_empty(self):
        """
        Test extraction on empty string.
        """
        keywords = nlp.extract_keywords("")
        self.assertEqual(keywords, [])

    @patch('modules.nlp.classifier_pipeline')
    def test_categorize_complaint_fraud(self, mock_pipeline):
        """
        Test categorization logic when the model predicts 'Fraud'.
        We mock the actual ML pipeline to avoid loading the heavy model.
        """
        # 1. Setup the mock return value
        # The pipeline returns a dict with 'labels' and 'scores'
        mock_pipeline.return_value = {
            'labels': ['Fraud & Scams', 'General Inquiry'],
            'scores': [0.95, 0.05]
        }

        # 2. Run the function
        result = nlp.categorize_complaint(self.sample_text_fraud)

        # 3. Assertions
        self.assertEqual(result['category'], 'Fraud & Scams')
        self.assertEqual(result['priority'], 'Critical') # Should map to Critical
        self.assertEqual(result['confidence'], 0.95)
        
        # Verify keywords are still extracted even with mocked classification
        self.assertTrue(len(result['keywords']) > 0)

    @patch('modules.nlp.classifier_pipeline')
    def test_categorize_complaint_general(self, mock_pipeline):
        """
        Test categorization logic when the model predicts 'General Inquiry'.
        """
        mock_pipeline.return_value = {
            'labels': ['General Inquiry', 'Fraud & Scams'],
            'scores': [0.88, 0.12]
        }

        result = nlp.categorize_complaint(self.sample_text_general)

        self.assertEqual(result['category'], 'General Inquiry')
        self.assertEqual(result['priority'], 'Low') # Should map to Low

    @patch('modules.nlp.classifier_pipeline', None) 
    @patch('modules.nlp.initialize_nlp_components')
    def test_lazy_loading_trigger(self, mock_init):
        """
        Test that initialize_nlp_components is called if the pipeline is None.
        """
        # If pipeline is None, calling categorize should trigger init
        nlp.categorize_complaint("test")
        mock_init.assert_called_once()

if __name__ == '__main__':
    unittest.main()