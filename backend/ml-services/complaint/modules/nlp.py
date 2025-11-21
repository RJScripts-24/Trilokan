import logging
import torch
from transformers import pipeline
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import string

# Configure logging
logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
# Candidate labels for categorization
CANDIDATE_LABELS = [
    "Fraud & Scams", 
    "Transaction Failure", 
    "Loan & EMI Issues", 
    "Account Access", 
    "Credit Card Dispute", 
    "General Inquiry"
]

# Priority mapping based on categories
PRIORITY_MAP = {
    "Fraud & Scams": "Critical",
    "Account Access": "High",
    "Transaction Failure": "High",
    "Credit Card Dispute": "Medium",
    "Loan & EMI Issues": "Medium",
    "General Inquiry": "Low"
}

# Global variable for the model pipeline
classifier_pipeline = None

def initialize_nlp_components():
    """
    Initializes the NLP pipeline and downloads necessary NLTK data.
    This is called lazily or on startup to avoid delaying app boot.
    """
    global classifier_pipeline
    
    # 1. Download NLTK resources if not present
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt', quiet=True)
        nltk.download('stopwords', quiet=True)

    # 2. Load Hugging Face Zero-Shot Classification Pipeline
    # We use 'distilbart-mnli-12-6' for a balance of speed and accuracy.
    # For production, you might use a dedicated verified model.
    if classifier_pipeline is None:
        logger.info("Loading Zero-Shot Classification model...")
        try:
            device = 0 if torch.cuda.is_available() else -1
            classifier_pipeline = pipeline(
                "zero-shot-classification", 
                model="valhalla/distilbart-mnli-12-6", # Lighter than facebook/bart-large-mnli
                device=device
            )
            logger.info("NLP Model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load NLP model: {e}")
            # Fallback to None, will handle in categorization logic
            classifier_pipeline = None

def extract_keywords(text):
    """
    Extracts significant keywords from the complaint text using NLTK.
    """
    try:
        stop_words = set(stopwords.words('english'))
        words = word_tokenize(text)
        
        # Filter out stopwords and punctuation
        keywords = [
            word.lower() for word in words 
            if word.lower() not in stop_words 
            and word not in string.punctuation 
            and len(word) > 2
        ]
        
        # Return top 5 unique keywords
        return list(set(keywords))[:5]
    except Exception as e:
        logger.warning(f"Keyword extraction failed: {e}")
        return []

def categorize_complaint(text):
    """
    Main function to process a complaint.
    Returns a dictionary with category, priority, confidence, and keywords.
    """
    # Ensure components are initialized
    if classifier_pipeline is None:
        initialize_nlp_components()

    result = {
        "category": "Uncategorized",
        "priority": "Low",
        "confidence": 0.0,
        "keywords": extract_keywords(text)
    }

    # Fallback if model failed to load
    if classifier_pipeline is None:
        logger.warning("NLP Pipeline unavailable. Returning default categorization.")
        return result

    try:
        # Run classification
        prediction = classifier_pipeline(text, CANDIDATE_LABELS, multi_label=False)
        
        # Extract top result
        top_category = prediction['labels'][0]
        top_score = prediction['scores'][0]

        result["category"] = top_category
        result["priority"] = PRIORITY_MAP.get(top_category, "Medium")
        result["confidence"] = round(top_score, 4)
        
        logger.info(f"Categorized as: {top_category} ({result['priority']})")
        
    except Exception as e:
        logger.error(f"Error during classification: {e}")
        result["category"] = "Error Processing"

    return result