# Aggregate key feature functions for easy import
from .sharpness import laplacian_variance
from .dct_hf import dct_highfreq_energy
from .face_embedding import compute_embedding, embedding_stability
from .optical_flow import flow_consistency
from .landmarks import detect_landmarks, landmark_jitter
from .rppg import extract_rppg
from .boundary_texture import boundary_blend_score
from .duplication import frame_duplication_ratio
from .lip_sync import lip_sync_score
from .audio_features import compute_mfccs, basic_audio_stats
from .doc_features import ocr_and_format_checks, font_consistency_score
from .normalizers import zscore, minmax
