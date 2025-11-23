import numpy as np
from typing import Dict, Any, List, Tuple
import logging

logger = logging.getLogger(__name__)

# Try to import normalizers, or define simple fallback if running standalone
try:
    from features.normalizers import calibrate_score, minmax
except ImportError:
    # Fallback normalizers
    def calibrate_score(val, thresh, direction):
        if direction == 'higher_is_fake': return 1.0 if val > thresh else 0.0
        return 1.0 if val < thresh else 0.0
    def minmax(val, a, b): return (val - a) / (b - a) if (b - a) > 0 else 0.0

class FusionScorer:
    def __init__(self, config: Dict = None):
        """
        Aggregates multi-modal fraud signals into a final decision.
        
        Args:
            config (dict): Optional configuration with custom weights and thresholds.
                          Format: {
                              'weights': {'w_df': 0.5, 'w_lv': 0.2, ...},
                              'PASS_THRESHOLD': 0.6
                          }
        """
        config = config or {}
        
        # Extract weights from config or use defaults
        weights_cfg = config.get('weights', {})
        
        # Default weights (aligned with Phase 2 requirements)
        self.w_df = weights_cfg.get('w_df', 0.5)    # Deepfake probability
        self.w_lv = weights_cfg.get('w_lv', 0.2)    # Liveness
        self.w_blur = weights_cfg.get('w_blur', 0.1)  # Blur score
        self.w_rppg = weights_cfg.get('w_rppg', 0.1)  # rPPG
        self.w_opt = weights_cfg.get('w_opt', 0.1)    # Optical flow
        
        # Pass threshold
        self.PASS_THRESHOLD = config.get('PASS_THRESHOLD', 0.6)
        
        # Legacy weights for backward compatibility
        self.weights = {
            'cnn_deepfake': 0.35,   # The heavy AI model opinion
            'rppg_liveness': 0.20,  # Pulse detection (Hard to spoof)
            'landmark_jitter': 0.15,# Geometric stability
            'audio_spoof': 0.20,    # TTS/Voice Clone detection
            'lip_sync': 0.10        # Audio-Visual consistency
        }
        
        # Thresholds for converting raw metrics to "Probability of Fake"
        self.thresholds = {
            'cnn_deepfake': 0.5,    # Score > 0.5 is fake
            'rppg_liveness': 0.5,   # Confidence < 0.5 is suspicious (inverted)
            'landmark_jitter': 0.4, # Normalized jitter > 0.4 is fake
            'audio_spoof': 0.5,     # Score > 0.5 is fake
            'lip_sync': 0.3         # Correlation < 0.3 is fake (inverted)
        }
        
        logger.info(
            f"FusionScorer initialized with weights: "
            f"df={self.w_df}, lv={self.w_lv}, blur={self.w_blur}, "
            f"rppg={self.w_rppg}, opt={self.w_opt}, threshold={self.PASS_THRESHOLD}"
        )

    def load_fusion_model(self, path: str):
        """
        Placeholder to load a trained logistic regression or MLP fusion model 
        if we move beyond heuristic weighting.
        """
        pass

    def _normalize_inputs(self, features: Dict[str, Any]) -> Dict[str, float]:
        """
        Converts diverse raw metrics into a unified 'Probability of Fake' (0.0 - 1.0).
        """
        probs = {}
        
        # 1. Deepfake CNN (Range 0-1, Higher is Fake)
        if 'cnn_score' in features:
            probs['cnn_deepfake'] = features['cnn_score']
            
        # 2. RPPG Liveness (Range 0-1 Confidence, Lower is Fake)
        # We invert it: High confidence = Low Fake Prob.
        if 'rppg_conf' in features:
            # If confidence is 0.9, fake_prob is 0.1
            probs['rppg_liveness'] = 1.0 - features['rppg_conf']
            
        # 3. Jitter (Range 0-1, Higher is Fake)
        if 'jitter_score' in features:
            probs['landmark_jitter'] = features['jitter_score']
            
        # 4. Audio Spoof (Range 0-1, Higher is Fake)
        if 'audio_spoof_score' in features:
            probs['audio_spoof'] = features['audio_spoof_score']
            
        # 5. Lip Sync (Range -1 to 1, Lower is Fake)
        if 'lip_sync_score' in features:
            # Map [-1, 1] to Fake Prob [1, 0]
            # Correlation 1.0 -> Fake Prob 0.0
            # Correlation 0.0 -> Fake Prob 1.0
            raw = features['lip_sync_score']
            # Clamp negative correlations to 0 for simplicity
            val = max(0.0, raw) 
            probs['lip_sync'] = 1.0 - val

        return probs

    def score(self, signals: Dict) -> Tuple[float, Dict]:
        """
        Computes the final Trust Score using Phase 2 specification.

        Args:
            signals (dict): Input signals with keys:
                - deepfake_prob: float (0..1) - probability that face is fake
                - liveness_ok: bool - liveness check passed
                - blur_score: float (0..100 or >0) - sharpness score
                - rppg_ok: bool - rPPG signal detected
                - opticalflow_ok: bool - optical flow consistent
                
                Also supports legacy signal names for backward compatibility:
                - cnn_score, rppg_conf, etc.

        Returns:
            Tuple of:
                - final_score: float (0..1) - Combined risk score
                - breakdown: dict - Weighted contributions from each signal
        """
        # Normalize signals to 0..1 risk scores
        risk_scores = {}
        breakdown = {}
        
        # 1. Deepfake probability (already 0..1, higher = more risk)
        if 'deepfake_prob' in signals:
            risk_scores['deepfake'] = float(signals['deepfake_prob'])
        elif 'cnn_score' in signals:
            # Legacy support
            risk_scores['deepfake'] = float(signals['cnn_score'])
        else:
            risk_scores['deepfake'] = 0.0
        
        # 2. Liveness (boolean, False = risk)
        if 'liveness_ok' in signals:
            risk_scores['liveness'] = 0.0 if signals['liveness_ok'] else 1.0
        elif 'rppg_conf' in signals:
            # Legacy: high confidence = low risk
            risk_scores['liveness'] = 1.0 - float(signals['rppg_conf'])
        else:
            risk_scores['liveness'] = 0.5  # Unknown
        
        # 3. Blur score (higher is better, normalize to 0..1 risk)
        if 'blur_score' in signals:
            blur = float(signals['blur_score'])
            # Assume blur_score ranges from 0-200, with >100 being good
            # Normalize: 0 = high risk (1.0), 200 = low risk (0.0)
            # Clamp and invert
            blur_normalized = np.clip(blur / 200.0, 0.0, 1.0)
            risk_scores['blur'] = 1.0 - blur_normalized
        else:
            risk_scores['blur'] = 0.5
        
        # 4. rPPG check (boolean, False = risk)
        if 'rppg_ok' in signals:
            risk_scores['rppg'] = 0.0 if signals['rppg_ok'] else 1.0
        else:
            risk_scores['rppg'] = 0.5
        
        # 5. Optical flow (boolean, False = risk)
        if 'opticalflow_ok' in signals:
            risk_scores['optflow'] = 0.0 if signals['opticalflow_ok'] else 1.0
        elif 'flow_variance' in signals:
            # Legacy: high variance = high risk
            flow_var = float(signals['flow_variance'])
            # Normalize assuming variance 0-1
            risk_scores['optflow'] = np.clip(flow_var, 0.0, 1.0)
        else:
            risk_scores['optflow'] = 0.5
        
        # Apply weights
        breakdown['deepfake_contribution'] = risk_scores['deepfake'] * self.w_df
        breakdown['liveness_contribution'] = risk_scores['liveness'] * self.w_lv
        breakdown['blur_contribution'] = risk_scores['blur'] * self.w_blur
        breakdown['rppg_contribution'] = risk_scores['rppg'] * self.w_rppg
        breakdown['optflow_contribution'] = risk_scores['optflow'] * self.w_opt
        
        # Compute final score (weighted sum)
        total_weight = self.w_df + self.w_lv + self.w_blur + self.w_rppg + self.w_opt
        final_score = sum(breakdown.values()) / total_weight if total_weight > 0 else 0.0
        
        # Clamp to [0, 1]
        final_score = np.clip(final_score, 0.0, 1.0)
        
        # Add metadata to breakdown
        breakdown['final_score'] = final_score
        breakdown['pass'] = final_score < self.PASS_THRESHOLD
        breakdown['risk_scores'] = risk_scores
        
        logger.debug(
            f"FusionScorer: final_score={final_score:.3f}, "
            f"pass={breakdown['pass']}, breakdown={breakdown}"
        )
        
        return final_score, breakdown

    def calibrate(self, raw_score: float) -> float:
        """
        Optional: Fits the output distribution to a probability curve.
        """
        # Simple sigmoid to push values towards 0 or 1
        return 1 / (1 + np.exp(-10 * (raw_score - 0.5)))
    
    def score_legacy(self, features_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Legacy scoring method for backward compatibility.
        Computes the final Trust Score using old interface.

        Args:
            features_dict (dict): Raw output from all feature extractors.
                                  e.g. {'cnn_score': 0.9, 'rppg_conf': 0.1, ...}

        Returns:
            dict: {
                'fused_score': float,    # 0.0 (Safe) to 1.0 (High Risk)
                'decision': str,         # 'TRUSTED', 'REVIEW', 'BLOCK'
                'explain_top_n': list    # Top reasons for the decision
            }
        """
        # Use new score() method
        final_score, breakdown = self.score(features_dict)
        
        # Map to legacy format
        if final_score > 0.75:
            decision = 'BLOCK'
        elif final_score > 0.40:
            decision = 'REVIEW'
        else:
            decision = 'TRUSTED'
        
        # Extract explanations
        explanations = []
        risk_scores = breakdown.get('risk_scores', {})
        for key, risk_val in risk_scores.items():
            if risk_val > 0.6:
                readable_name = key.replace('_', ' ').title()
                explanations.append(f"{readable_name} indicated high risk ({risk_val:.2f})")
        
        # Critical overrides
        if risk_scores.get('deepfake', 0) > 0.85:
            decision = 'BLOCK'
            explanations.insert(0, "CRITICAL: Deepfake Detection Triggered")
        
        if risk_scores.get('liveness', 0) > 0.9:
            decision = 'BLOCK'
            explanations.insert(0, "CRITICAL: Liveness Check Failed")
        
        return {
            'fused_score': float(final_score),
            'decision': decision,
            'explain_top_n': explanations[:3]
        }

# Singleton instance
_fusion_scorer_instance = None

def get_fusion_scorer(config: Dict = None):
    """Returns the singleton fusion scorer instance."""
    global _fusion_scorer_instance
    if _fusion_scorer_instance is None:
        _fusion_scorer_instance = FusionScorer(config)
    return _fusion_scorer_instance