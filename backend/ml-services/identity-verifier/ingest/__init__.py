"""
Ingest module

Purpose: Capture and normalize raw inputs (video/audio/doc) and produce ProcessedCapture objects.

Exposes:
- IngestCapture (class from capture.py)
- capture_from_file, capture_from_stream (from capture.py)
- extract_frames, align_face_crop (from frame_utils.py)
- load_audio, get_vad_segments (from audio_utils.py)
- load_document_image, normalize_orientation, extract_exif (from doc_ingest.py)
- collect_meta (from meta_collector.py)
- ProcessedCapture, FrameInfo, AudioSegment (from schemas.py)
"""

from .capture import IngestCapture, capture_from_file, capture_from_stream
from .frame_utils import extract_frames, align_face_crop
from .audio_utils import load_audio, get_vad_segments
from .doc_ingest import load_document_image, normalize_orientation, extract_exif
from .meta_collector import collect_meta
from .schemas import ProcessedCapture, FrameInfo, AudioSegment
