"""
doc_ingest.py
Purpose: Document/image normalization and EXIF extraction.
"""
import cv2
from PIL import Image, ExifTags
import numpy as np
import io

def load_document_image(path):
    """
    Load and return document image as numpy array (BGR, OpenCV format).
    Args:
        path (str): Path to image file.
    Returns:
        img (np.ndarray): Image in BGR format
    """
    img = cv2.imread(path)
    if img is None:
        raise ValueError(f"Could not load image: {path}")
    return img

def normalize_orientation(img):
    """
    Standardize image orientation using EXIF (if available).
    Args:
        img (np.ndarray): Image in BGR format
    Returns:
        img (np.ndarray): Oriented image
    """
    # Convert to RGB for PIL
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(img_rgb)
    try:
        exif = pil_img._getexif()
        if exif is not None:
            for tag, value in exif.items():
                decoded = ExifTags.TAGS.get(tag, tag)
                if decoded == 'Orientation':
                    orientation = value
                    if orientation == 3:
                        pil_img = pil_img.rotate(180, expand=True)
                    elif orientation == 6:
                        pil_img = pil_img.rotate(270, expand=True)
                    elif orientation == 8:
                        pil_img = pil_img.rotate(90, expand=True)
    except Exception:
        pass  # No EXIF or orientation info
    # Convert back to BGR
    img_oriented = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    return img_oriented

def extract_exif(img):
    """
    Extract EXIF metadata from image (as dict).
    Args:
        img (np.ndarray): Image in BGR format
    Returns:
        exif_dict (dict): EXIF metadata (empty if not available)
    """
    # Convert to RGB for PIL
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(img_rgb)
    exif_dict = {}
    try:
        exif = pil_img._getexif()
        if exif is not None:
            for tag, value in exif.items():
                decoded = ExifTags.TAGS.get(tag, tag)
                exif_dict[decoded] = value
    except Exception:
        pass
    return exif_dict
