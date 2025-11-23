import cv2
import numpy as np
import pytesseract
import re
from typing import Dict, Any, List

# Configure Tesseract path if necessary for your environment
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def ocr_and_format_checks(doc_image: np.ndarray) -> Dict[str, Any]:
    """
    Extracts text from a document image and validates it against known financial ID patterns.
    
    This addresses the "Document Authenticity" requirement: extracting data via OCR and 
    comparing it against official formats[cite: 21].

    Args:
        doc_image (np.ndarray): The document image (BGR or Gray).

    Returns:
        dict: {
            'fields': dict,       # Extracted key-value pairs (e.g., {'pan': 'ABCDE1234F'})
            'format_ok': bool,    # True if regex patterns match found IDs
            'confidence': float,  # Average OCR confidence score
            'debug': dict         # Raw text and preprocessing info
        }
    """
    result = {
        'fields': {},
        'format_ok': False,
        'confidence': 0.0,
        'debug': {}
    }

    if doc_image is None or doc_image.size == 0:
        return result

    try:
        # 1. Preprocessing for OCR
        # Convert to grayscale
        if len(doc_image.shape) == 3:
            gray = cv2.cvtColor(doc_image, cv2.COLOR_BGR2GRAY)
        else:
            gray = doc_image

        # Apply thresholding to binarize the image (improves text readability)
        # OTSU thresholding is generally good for scanned docs
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Denoise slightly
        processed_img = cv2.fastNlMeansDenoising(binary, None, 10, 7, 21)

        # 2. Run OCR
        # We use image_to_data to get confidence scores per word
        ocr_data = pytesseract.image_to_data(processed_img, output_type=pytesseract.Output.DICT)
        
        # Reconstruct full text for regex search
        full_text = " ".join([text for text in ocr_data['text'] if text.strip() != ''])
        
        # Calculate average confidence of the recognized text
        conf_scores = [int(c) for c in ocr_data['conf'] if c != '-1']
        avg_confidence = np.mean(conf_scores) / 100.0 if conf_scores else 0.0

        # 3. Pattern Matching (Regex)
        # Examples of common ID formats (e.g., Indian PAN Card: 5 letters, 4 digits, 1 letter)
        patterns = {
            'PAN': r'[A-Z]{5}[0-9]{4}[A-Z]{1}',
            'AADHAAR': r'[2-9]{1}[0-9]{3}\s[0-9]{4}\s[0-9]{4}',  # 12 digits, often spaced
            'DOB': r'\d{2}/\d{2}/\d{4}'
        }

        found_fields = {}
        valid_format_found = False

        for label, pattern in patterns.items():
            matches = re.findall(pattern, full_text.upper())
            if matches:
                found_fields[label] = matches[0] # Take the first match
                valid_format_found = True

        # 4. Populate Result
        result['fields'] = found_fields
        result['format_ok'] = valid_format_found
        result['confidence'] = float(avg_confidence)
        result['debug'] = {
            'raw_text_snippet': full_text[:100] + "...",
            'num_words_detected': len(conf_scores)
        }

    except Exception as e:
        # Graceful failure if Tesseract is not installed or image is bad
        result['debug']['error'] = str(e)
        print(f"OCR Error: {e}")

    return result


def font_consistency_score(doc_image: np.ndarray) -> Dict[str, Any]:
    """
    Analyzes the image for font size/alignment inconsistencies that might indicate 
    digital tampering (e.g., copy-pasting numbers onto an ID).

    This relates to checking for "metadata inconsistencies, fonts".

    Args:
        doc_image (np.ndarray): The document image.

    Returns:
        dict: {
            'value': float,      # Consistency score (0.0 to 1.0). 1.0 = highly consistent.
            'confidence': float, # Reliability of the check
            'debug': dict
        }
    """
    result = {
        'value': 0.0,
        'confidence': 0.0,
        'debug': {}
    }

    if doc_image is None or doc_image.size == 0:
        return result

    try:
        # Use Tesseract to get bounding boxes of characters/words
        # psm 6 = Assume a single uniform block of text
        boxes = pytesseract.image_to_data(doc_image, output_type=pytesseract.Output.DICT, config='--psm 6')

        heights = []
        confidences = []

        n_boxes = len(boxes['text'])
        for i in range(n_boxes):
            # Filter out empty text or low confidence garbage
            if int(boxes['conf'][i]) > 40 and boxes['text'][i].strip():
                h = boxes['height'][i]
                heights.append(h)
                confidences.append(int(boxes['conf'][i]))

        if not heights:
            result['confidence'] = 0.0
            return result

        # 1. Analyze Height Variance
        # In a genuine printed document, lines of text usually have consistent character heights.
        # Tampered documents often have scaling mismatches.
        heights_arr = np.array(heights)
        
        # Calculate Coefficient of Variation (CV) = std_dev / mean
        # Lower CV means more consistent fonts.
        mean_h = np.mean(heights_arr)
        std_h = np.std(heights_arr)
        
        if mean_h == 0:
            cv = 1.0
        else:
            cv = std_h / mean_h

        # Normalize logic: 
        # If CV is > 0.5 (50% variance), it's likely inconsistent/handwritten or bad OCR. 
        # If CV is < 0.1, it's very consistent.
        consistency_score = max(0.0, 1.0 - (cv * 2)) # Simple linear mapping

        # 2. Populate Result
        result['value'] = float(consistency_score)
        
        # Confidence is higher if we detected many characters with high OCR confidence
        ocr_reliability = np.mean(confidences) / 100.0
        sample_size_reliability = min(1.0, len(heights) / 10.0) # Need at least 10 chars
        
        result['confidence'] = float(ocr_reliability * sample_size_reliability)
        result['debug'] = {
            'mean_height': mean_h,
            'std_dev_height': std_h,
            'coeff_variation': cv
        }

    except Exception as e:
        result['debug']['error'] = str(e)
        print(f"Font Check Error: {e}")

    return result