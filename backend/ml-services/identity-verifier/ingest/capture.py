"""
capture.py
Purpose: Top-level ingestion API for video/audio/document capture.
"""
from .schemas import ProcessedCapture, FrameInfo, AudioSegment
from .frame_utils import extract_frames, align_face_crop
from .audio_utils import load_audio, get_vad_segments
from .doc_ingest import load_document_image, normalize_orientation, extract_exif
from .meta_collector import collect_meta
import os
import cv2
import numpy as np


class IngestCapture:
    """
    IngestCapture class for processing video/audio/document inputs.
    Compatible with Phase 2 pipeline requirements.
    """
    def __init__(self, video_path=None, audio_path=None, doc_path=None, meta_request=None):
        """
        Initialize IngestCapture with file paths.
        
        Args:
            video_path: Path to video file
            audio_path: Path to audio file (optional if video has audio)
            doc_path: Path to document image
            meta_request: Optional metadata request object
        """
        self.video_path = video_path
        self.audio_path = audio_path
        self.doc_path = doc_path
        self.meta_request = meta_request
        
        # Initialize data containers
        self._frames = []
        self._face_boxes = []
        self._audio = None
        self._sample_rate = 16000
        self._audio_segments = []
        self._doc_image = None
        self._metadata = {}
        
        # Video properties
        self.total_frames = 0
        self.fps = 0.0
        
        # Process files on initialization
        self._process()
    
    def _process(self):
        """Process input files and extract frames/audio/metadata."""
        # Process video
        if self.video_path and os.path.exists(self.video_path):
            try:
                self._extract_video_frames()
                # Try to extract audio from video
                try:
                    waveform, sr = load_audio(self.video_path)
                    self._audio = waveform
                    self._sample_rate = sr
                    self._audio_segments = get_vad_segments(waveform, sr)
                except Exception:
                    pass
            except Exception as e:
                print(f"Warning: Error processing video: {e}")
        
        # Process separate audio file if provided
        if self.audio_path and os.path.exists(self.audio_path):
            try:
                waveform, sr = load_audio(self.audio_path)
                self._audio = waveform
                self._sample_rate = sr
                self._audio_segments = get_vad_segments(waveform, sr)
            except Exception as e:
                print(f"Warning: Error processing audio: {e}")
        
        # Process document
        if self.doc_path and os.path.exists(self.doc_path):
            try:
                img = load_document_image(self.doc_path)
                self._doc_image = normalize_orientation(img)
            except Exception as e:
                print(f"Warning: Error processing document: {e}")
        
        # Collect metadata
        if self.meta_request is not None:
            self._metadata = collect_meta(self.meta_request)
    
    def _extract_video_frames(self):
        """Extract frames from video file using OpenCV."""
        if not self.video_path or not os.path.exists(self.video_path):
            return
        
        cap = cv2.VideoCapture(self.video_path)
        
        # Get video properties
        self.total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.fps = cap.get(cv2.CAP_PROP_FPS)
        
        frame_id = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Store frame as numpy array
            self._frames.append(frame)
            
            # Create dummy face box (full frame) - real implementation would use face detector
            h, w = frame.shape[:2]
            box = (0, 0, w, h)
            self._face_boxes.append(box)
            
            frame_id += 1
        
        cap.release()
    
    def get(self, key, default=None):
        """Dict-like access for pipeline compatibility."""
        if key == 'frames':
            return self._frames
        elif key == 'face_boxes':
            return self._face_boxes
        elif key == 'audio':
            return self._audio
        elif key == 'sample_rate':
            return self._sample_rate
        elif key == 'audio_segments':
            return self._audio_segments
        elif key == 'doc_image':
            return self._doc_image
        elif key == 'metadata':
            return self._metadata
        else:
            return default
    
    def __getitem__(self, key):
        """Dict-like access using bracket notation."""
        value = self.get(key)
        if value is None:
            raise KeyError(f"Key '{key}' not found in IngestCapture")
        return value
    
    @property
    def frames(self):
        """Get extracted video frames."""
        return self._frames
    
    @property
    def face_boxes(self):
        """Get face bounding boxes."""
        return self._face_boxes
    
    @property
    def audio(self):
        """Get audio waveform."""
        return self._audio
    
    @property
    def sample_rate(self):
        """Get audio sample rate."""
        return self._sample_rate
    
    @property
    def audio_segments(self):
        """Get voice activity segments."""
        return self._audio_segments
    
    @property
    def doc_image(self):
        """Get document image."""
        return self._doc_image
    
    @property
    def metadata(self):
        """Get metadata."""
        return self._metadata


def capture_from_file(path, meta_request=None):
    """
    Ingest from file path. Returns ProcessedCapture.
    Args:
        path (str): Path to video/audio/document file.
        meta_request: Optional request object for metadata collection.
    Returns:
        ProcessedCapture
    """
    ext = os.path.splitext(path)[-1].lower()
    frames = []
    face_boxes = []
    audio_segments = []
    doc_image = None
    meta = None

    # Video file: extract frames and audio
    if ext in ['.mp4', '.avi', '.mov', '.mkv']:
        # Extract frames (list of np.ndarray)
        raw_frames = extract_frames(path)
        # For demo, create FrameInfo with dummy face boxes (real impl: run detector)
        for i, frame in enumerate(raw_frames):
            # Dummy: no face detection, just full frame box
            h, w = frame.shape[:2]
            box = (0, 0, w, h)
            frames.append(FrameInfo(frame_id=i, box=box, timestamp=None))
            face_boxes.append(box)
        # Extract audio from video (librosa can do this if ffmpeg installed)
        try:
            waveform, sr = load_audio(path)
            audio_segments = get_vad_segments(waveform, sr)
        except Exception:
            audio_segments = []
    # Audio file
    elif ext in ['.wav', '.flac', '.mp3', '.ogg']:
        waveform, sr = load_audio(path)
        audio_segments = get_vad_segments(waveform, sr)
    # Document image
    elif ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
        img = load_document_image(path)
        doc_image = normalize_orientation(img)
        # Optionally extract EXIF/meta here
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    # Collect meta if request provided
    if meta_request is not None:
        meta = collect_meta(meta_request)

    return ProcessedCapture(
        frames=frames,
        face_boxes=face_boxes,
        audio_segments=audio_segments,
        doc_image=doc_image,
        meta=meta
    )

def capture_from_stream(stream, meta_request=None):
    """
    Ingest from stream. Returns ProcessedCapture.
    Args:
        stream: File-like object or video/audio stream.
        meta_request: Optional request object for metadata collection.
    Returns:
        ProcessedCapture
    """
    # TODO: Implement stream-based extraction (e.g., OpenCV VideoCapture, BytesIO)
    raise NotImplementedError("Stream ingestion not implemented yet.")
