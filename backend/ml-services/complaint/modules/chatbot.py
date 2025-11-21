import logging
import json
import os
import random
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import nltk
from nltk.stem import WordNetLemmatizer

# Configure logging
logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
DATA_FILE_PATH = os.path.join(os.path.dirname(__file__), '../data/faqs.json')
CONFIDENCE_THRESHOLD = 0.4  # Minimum similarity score to accept a match

# Global variables
vectorizer = None
tfidf_matrix = None
questions_list = []
answers_list = []
lemmatizer = WordNetLemmatizer()

def normalize_text(text):
    """
    Simple text normalization: lowercase and lemmatize.
    """
    tokens = nltk.word_tokenize(text.lower())
    return ' '.join([lemmatizer.lemmatize(token) for token in tokens])

def load_knowledge_base():
    """
    Loads the FAQ JSON and builds the TF-IDF matrix for similarity matching.
    """
    global vectorizer, tfidf_matrix, questions_list, answers_list

    if not os.path.exists(DATA_FILE_PATH):
        logger.error(f"FAQ data not found at {DATA_FILE_PATH}")
        return False

    try:
        with open(DATA_FILE_PATH, 'r') as f:
            data = json.load(f)

        questions_list = []
        answers_list = []

        for intent in data['intents']:
            for pattern in intent['patterns']:
                questions_list.append(pattern)
                # Store the answer associated with this pattern
                # Randomly select one response if multiple exist for variety
                answers_list.append(random.choice(intent['responses']))

        # specialized preprocessing for better matching
        processed_questions = [normalize_text(q) for q in questions_list]

        # Initialize TF-IDF Vectorizer
        # ngram_range=(1,2) helps capture phrases like "credit card" or "interest rate"
        vectorizer = TfidfVectorizer(tokenizer=None, stop_words='english', ngram_range=(1, 2))
        tfidf_matrix = vectorizer.fit_transform(processed_questions)

        logger.info(f"Chatbot Knowledge Base loaded with {len(questions_list)} patterns.")
        return True

    except Exception as e:
        logger.error(f"Error loading knowledge base: {e}")
        return False

def get_bot_response(user_message, user_id="anonymous"):
    """
    Main function to generate a response for a user message.
    """
    global vectorizer, tfidf_matrix

    # Lazy load the model if not ready
    if vectorizer is None:
        success = load_knowledge_base()
        if not success:
            return "I am currently undergoing maintenance and cannot access my knowledge base. Please try again later."

    try:
        # 1. Preprocess User Input
        cleaned_input = normalize_text(user_message)

        # 2. Transform Input to TF-IDF Vector
        user_vector = vectorizer.transform([cleaned_input])

        # 3. Calculate Cosine Similarity
        similarities = cosine_similarity(user_vector, tfidf_matrix)
        
        # Get the index of the most similar question
        best_match_idx = np.argmax(similarities)
        best_score = similarities[0][best_match_idx]

        logger.info(f"User: '{user_message}' | Match Score: {best_score:.4f} | Matched: '{questions_list[best_match_idx]}'")

        # 4. Determine Response
        if best_score > CONFIDENCE_THRESHOLD:
            return answers_list[best_match_idx]
        else:
            # Fallback logic
            return "I'm not sure I understand. Could you please rephrase? You can ask about fraud reporting, loan status, or grievance tickets."

    except Exception as e:
        logger.error(f"Error generating bot response: {e}")
        return "I encountered an error processing your request."

# --- INITIALIZATION ---
# Ensure NLTK data is available
try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet', quiet=True)
    nltk.download('omw-1.4', quiet=True)
    nltk.download('punkt', quiet=True)