import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS

# Import logic from the modules directory (to be created next)
# We assume these modules will export specific functions
try:
    from modules.nlp import categorize_complaint
    from modules.chatbot import get_bot_response
except ImportError:
    # Fallback for when running app.py before modules are fully created
    print("Warning: Modules not found. Ensure modules/nlp.py and modules/chatbot.py exist.")
    def categorize_complaint(text): return {"category": "General", "priority": "Low", "confidence": 0.0}
    def get_bot_response(msg, uid): return "System modules are initializing."

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask App
app = Flask(__name__)
CORS(app)  # Enable CORS to allow requests from the React frontend

@app.route('/', methods=['GET'])
def index():
    """Root endpoint to verify the service is running."""
    return jsonify({
        "service": "Grievance AI Service",
        "status": "active",
        "version": "1.0.0"
    }), 200

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for Docker/Kubernetes probes."""
    return jsonify({"status": "healthy"}), 200

@app.route('/api/v1/categorize', methods=['POST'])
def categorize_complaint_endpoint():
    """
    Endpoint to analyze and categorize a complaint.
    Expected JSON payload: { "text": "I lost money in a fake app scam..." }
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            logger.warning("Categorization request missing 'text' field")
            return jsonify({"error": "Missing 'text' field in request body"}), 400

        complaint_text = data['text']
        logger.info(f"Processing complaint categorization. Length: {len(complaint_text)}")

        # Call the NLP module to process the text
        # Expected result: {'category': 'Fraud', 'priority': 'High', 'keywords': [...]}
        result = categorize_complaint(complaint_text)

        return jsonify({
            "success": True,
            "data": result
        }), 200

    except Exception as e:
        logger.error(f"Error in categorization endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error processing complaint"}), 500

@app.route('/api/v1/chat', methods=['POST'])
def chat_endpoint():
    """
    Endpoint for the AI Chatbot.
    Expected JSON payload: { "message": "How do I file a fraud report?", "user_id": "123" }
    """
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            logger.warning("Chat request missing 'message' field")
            return jsonify({"error": "Missing 'message' field in request body"}), 400

        user_message = data['message']
        user_id = data.get('user_id', 'anonymous') # Context tracking if needed

        logger.info(f"Received chat message from user {user_id}")

        # Call the Chatbot module to generate a response
        bot_reply = get_bot_response(user_message, user_id)

        return jsonify({
            "success": True,
            "response": bot_reply
        }), 200

    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error in chatbot"}), 500

if __name__ == '__main__':
    # Get port from environment variable or default to 5000
    port = int(os.environ.get('PORT', 5000))
    
    logger.info(f"Starting Grievance AI Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)