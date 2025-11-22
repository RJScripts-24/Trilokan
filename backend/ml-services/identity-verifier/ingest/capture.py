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
