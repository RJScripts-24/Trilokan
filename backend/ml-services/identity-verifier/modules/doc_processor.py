import cv2
import numpy as np
import os
import logging
try:
    import pytesseract
except ImportError:
    logging.error("pytesseract library not found. Please install it: pip install pytesseract")
    pytesseract = None

# Configure logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# --- Constants for Analysis ---

# 1. Glare Check: If more than 5% of the image is "blown out" (pure white),
# it might be an intentional glare spoof.
GLARE_THRESHOLD = 240  # Pixel intensity (out of 255)
MAX_GLARE_RATIO = 0.05

# 2. Blur/Sharpness Check: We check if the sharpness is within a "natural" range.
# Too low = blurry. Too high = digital noise/artifact.
MIN_SHARPNESS = 100.0
MAX_SHARPNESS = 2500.0

# 3. OCR Keyword Check: We expect to find at least 2 common ID keywords.
# This simulates checking against a "known format."
REQUIRED_KEYWORDS = 2
KEYWORD_LIST = [
    "name", "dob", "birth", "sex", "expires", "exp", "issued", "iss",
    "license", "id number", "government", "republic", "citizen", "card"
]

def analyze_document(image_path):
    """
    Analyzes an ID document image for signs of spoofing or tampering.
    It performs OCR to extract text and heuristic checks for quality.
    
    Args:
        image_path (str): The file path to the uploaded ID image.

    Returns:
        dict: A dictionary containing the analysis results.
    """
    log.info(f"Starting document analysis for: {image_path}")

    if pytesseract is None:
        return {'status': 'error', 'message': 'Server configuration error: Tesseract is not installed or configured.'}

    try:
        # --- 1. Load Image ---
        image = cv2.imread(image_path)
        if image is None:
            log.error("Error: Could not read image file.")
            return {'status': 'error', 'message': 'Could not read image file.'}

        # Convert to grayscale for all analyses
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        total_pixels = gray.shape[0] * gray.shape[1]

        # --- 2. Heuristic 1: Glare Detection ---
        # Threshold the image to find very bright spots
        _, glare_thresh = cv2.threshold(gray, GLARE_THRESHOLD, 255, cv2.THRESH_BINARY)
        white_pixels = np.sum(glare_thresh == 255)
        glare_ratio = white_pixels / total_pixels
        glare_passed = glare_ratio < MAX_GLARE_RATIO
        
        log.info(f"Glare ratio: {glare_ratio:.4f}. Pass: {glare_passed}")

        # --- 3. Heuristic 2: Sharpness (Blur) Check ---
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        sharpness_passed = MIN_SHARPNESS < sharpness < MAX_SHARPNESS
        
        log.info(f"Sharpness score: {sharpness:.2f}. Pass: {sharpness_passed}")

        # --- 4. Heuristic 3: OCR Keyword Validation ---
        # Pre-process for better OCR: apply Otsu's thresholding
        _, ocr_thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Run OCR
        extracted_text = pytesseract.image_to_string(ocr_thresh)
        extracted_text_lower = extracted_text.lower()
        
        found_keywords = [k for k in KEYWORD_LIST if k in extracted_text_lower]
        keyword_passed = len(found_keywords) >= REQUIRED_KEYWORDS
        
        log.info(f"OCR found {len(found_keywords)} keywords: {found_keywords}")

    except Exception as e:
        log.error(f"Error during document processing: {e}", exc_info=True)
        # This can happen if Tesseract isn't installed on the system
        if "tesseract is not installed" in str(e).lower():
            return {'status': 'error', 'message': 'Server configuration error: Tesseract executable not found. Please install it.'}
        return {'status': 'error', 'message': f'Internal processing error: {e}'}

    # --- 5. Final Verdict ---
    overall_pass = glare_passed and sharpness_passed and keyword_passed

    # Build Response Dictionary
    result = {
        'status': 'success',
        'message': 'Document analysis complete.',
        'overall_pass': overall_pass,
        'checks': [
            {
                'name': 'Glare Check',
                'passed': glare_passed,
                'details': f'Image is clear of glare.' if glare_passed else 'High glare detected, which may be obscuring information.'
            },
            {
                'name': 'Sharpness Check',
                'passed': sharpness_passed,
                'details': 'Image sharpness is within natural range.' if sharpness_passed else 'Image is either too blurry or contains digital noise.'
            },
            {
                'name': 'Format Check (OCR)',
                'passed': keyword_passed,
                'details': f'Found {len(found_keywords)} valid ID keywords.' if keyword_passed else 'Could not validate document format. Text may be unreadable or not a valid ID.'
            }
        ],
        'extracted_data': {
            'keywords_found': found_keywords,
            'full_text_preview': extracted_text[:200] + "..." if len(extracted_text) > 200 else extracted_text
        }
    }
    
    log.info(f"Analysis result: {result}")
    return result

# --- Main block for testing ---
if __name__ == "__main__":
    # You can test this script by placing an ID image named 'test_doc.png'
    # in the 'identity-verifier' directory and running 'python modules/doc_processor.py'
    
    # This path is relative to the root of the 'identity-verifier' service
    test_image_path = '../test_doc.png' 
    
    if not os.path.exists(test_image_path):
        print(f"Test image not found at {test_image_path}")
        print("Please add a .png or .jpg file to test.")
    else:
        print(f"Running test analysis on {test_image_path}...")
        results = analyze_document(test_image_path)
        import json
        print(json.dumps(results, indent=2))