"""
schemas.py
Purpose: Define ProcessedCapture and DTO schemas (no PII in persisted logs).
"""
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Any

@dataclass
class FrameInfo:
    """Metadata for a single video frame."""
    frame_id: int
    box: Optional[Tuple[int, int, int, int]] = None  # (x, y, w, h)
    timestamp: Optional[float] = None  # seconds
    debug: Optional[Any] = None  # Optional debug info

@dataclass
class AudioSegment:
    """A segment of audio with start/end times and data."""
    start: float  # seconds
    end: float    # seconds
    data: Any     # waveform data (e.g., np.ndarray or bytes)
    confidence: Optional[float] = None
    debug: Optional[Any] = None

@dataclass
class ProcessedCapture:
    """Normalized input for the pipeline: frames, face boxes, audio, doc image, meta."""
    frames: List[FrameInfo] = field(default_factory=list)
    face_boxes: List[Tuple[int, int, int, int]] = field(default_factory=list)
    audio_segments: List[AudioSegment] = field(default_factory=list)
    doc_image: Optional[Any] = None  # e.g., np.ndarray
    meta: Optional[dict] = None
    exif: Optional[dict] = None
    # Add more fields as needed for future DTOs
