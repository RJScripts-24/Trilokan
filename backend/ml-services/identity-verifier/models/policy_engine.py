from typing import Dict, Any, List, Tuple
import logging

logger = logging.getLogger(__name__)

class PolicyEngine:
    def __init__(self, config_path: str = None):
        """
        Manages business logic, hard rules, and decision thresholds.
        
        Args:
            config_path (str): Optional JSON path for dynamic rule loading.
        """
        # Default Base Thresholds
        self.base_thresholds = {
            'block': 0.75,   # Above this = BLOCK
            'review': 0.40   # Above this = MANUAL REVIEW
        }
        
        # Phase 2: Fusion score pass threshold
        self.PASS_THRESHOLD = 0.6
        
        # Context Modifiers (Stricter logic for risky contexts)
        self.risk_multipliers = {
            'login': 1.0,           # Standard
            'profile_update': 0.9,  # Slightly stricter
            'high_value_tx': 0.8    # High Value Transaction (Lowers the block threshold)
        }
        
        # Hard Rules (Overrides)
        # If any of these raw signals exceed their limit, we BLOCK immediately
        # regardless of the average score.
        self.critical_overrides = {
            'audio_spoof_score': 0.90, # If audio is definitely fake, block.
            'rppg_confidence': 0.10,    # If pulse signal is non-existent (inverted check).
            'video_fake_prob': 0.85     # Phase 2: If deepfake prob very high, block
        }
        
        # Mock Blocklist/Allowlist (In prod, connect to Redis/DB)
        self.user_blocklist = ["user_fraud_123", "banned_device_99"]
        self.user_allowlist = ["admin_superuser"]
        
        logger.info(f"PolicyEngine initialized with PASS_THRESHOLD={self.PASS_THRESHOLD}")

    def apply_policy(
        self, 
        fused_score: float, 
        raw_signals: Dict[str, Any], 
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Determines the final action based on score, context, and hard rules.

        Args:
            fused_score (float): The aggregated 0-1 fraud probability from FusionScorer.
            raw_signals (dict): The individual feature inputs (for checking overrides).
            context (dict): Metadata (e.g., {'action': 'high_value_tx', 'user_id': 'abc'}).

        Returns:
            dict: {
                'final_decision': str,   # 'TRUSTED', 'REVIEW', 'BLOCK'
                'action_code': int,      # 0=OK, 1=Challenge, 2=Deny
                'effective_score': float,
                'reasons': list,
                'risk_category': str     # Phase 2: 'HIGH' or 'LOW'
            }
        """
        context = context or {}
        user_id = context.get('user_id', '')
        action_type = context.get('action', 'login')
        reasons = []

        # 1. Check Allowlist/Blocklist (Fast Path)
        if user_id in self.user_blocklist:
            return self._build_response('BLOCK', 2, 1.0, ["User ID in blocklist"], 'HIGH')
        
        if user_id in self.user_allowlist:
            return self._build_response('TRUSTED', 0, 0.0, ["User ID in allowlist"], 'LOW')

        # 2. Check Critical Hard Rules (Veto Power)
        # Phase 2: Added video_fake_prob override
        if 'video_fake_prob' in raw_signals:
            if raw_signals['video_fake_prob'] > self.critical_overrides['video_fake_prob']:
                reasons.append(f"CRITICAL: Video deepfake probability {raw_signals['video_fake_prob']:.2f} exceeded safety limit")
                return self._build_response('BLOCK', 2, 1.0, reasons, 'HIGH')
        
        if 'audio_spoof_score' in raw_signals:
            if raw_signals['audio_spoof_score'] > self.critical_overrides['audio_spoof_score']:
                reasons.append(f"CRITICAL: Audio spoof score {raw_signals['audio_spoof_score']:.2f} exceeded safety limit")
                return self._build_response('BLOCK', 2, 1.0, reasons, 'HIGH')
        
        # RPPG Confidence is usually "Higher is Better". If it's extremely low (0.0 - 0.1), no pulse found.
        if 'rppg_conf' in raw_signals:
            if raw_signals['rppg_conf'] < self.critical_overrides['rppg_confidence']:
                reasons.append("CRITICAL: Liveness check failed (No physiological signal)")
                return self._build_response('BLOCK', 2, 1.0, reasons, 'HIGH')

        # 3. Apply Context Modifiers
        # If this is a high-value transaction, we lower the threshold for blocking.
        multiplier = self.risk_multipliers.get(action_type, 1.0)
        
        block_thresh = self.base_thresholds['block'] * multiplier
        review_thresh = self.base_thresholds['review'] * multiplier
        
        if multiplier < 1.0:
            reasons.append(f"Thresholds tightened due to sensitive context: {action_type}")

        # 4. Phase 2: Risk Category based on fusion score
        risk_category = 'HIGH' if fused_score >= self.PASS_THRESHOLD else 'LOW'
        
        # 5. Final Decision Mapping
        decision = 'TRUSTED'
        action_code = 0
        
        if fused_score >= block_thresh:
            decision = 'BLOCK'
            action_code = 2
            reasons.append(f"Score {fused_score:.2f} exceeded block threshold {block_thresh:.2f}")
        elif fused_score >= review_thresh:
            decision = 'REVIEW'
            action_code = 1 # Suggest Step-Up Auth (OTP/Bio-Challenge)
            reasons.append(f"Score {fused_score:.2f} requires manual review or step-up")
        else:
            decision = 'TRUSTED'
            reasons.append("Score within safe limits")

        return self._build_response(decision, action_code, fused_score, reasons, risk_category)

    def _build_response(
        self, 
        decision: str, 
        code: int, 
        score: float, 
        reasons: List[str],
        risk_category: str = 'LOW'
    ) -> Dict[str, Any]:
        """Build standardized policy response with Phase 2 risk_category."""
        return {
            'final_decision': decision,
            'action_code': code,
            'effective_score': score,
            'reasons': reasons,
            'risk_category': risk_category
        }

# Singleton for easy access
_policy_instance = None

def get_policy_engine():
    global _policy_instance
    if _policy_instance is None:
        _policy_instance = PolicyEngine()
    return _policy_instance


def apply_policy(
    fused_score: float = None,
    raw_signals: Dict[str, Any] = None,
    context: Dict[str, Any] = None,
    signals: Dict[str, Any] = None,
    config: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Convenience module-level function that delegates to PolicyEngine.apply_policy().
    
    Supports both calling conventions:
    - apply_policy(fused_score, raw_signals, context)  [original]
    - apply_policy(signals=..., config=...)             [test stub pattern]
    
    Args:
        fused_score: Aggregated fraud probability (0-1)
        raw_signals: Individual feature inputs
        context: Metadata (user_id, action type, etc.)
        signals: Alternative parameter name for raw_signals (for test compatibility)
        config: Alternative parameter for context (for test compatibility)
    
    Returns:
        dict: Policy decision with final_decision, action_code, effective_score, reasons
    """
    engine = get_policy_engine()
    
    # Handle alternative parameter names for test compatibility
    if signals is not None and raw_signals is None:
        raw_signals = signals
    if config is not None and context is None:
        context = config
    
    # If fused_score not provided, try to extract from signals
    if fused_score is None and raw_signals:
        fused_score = raw_signals.get('fused_score', raw_signals.get('deepfake_prob', 0.5))
    
    # Defaults for safety
    fused_score = fused_score if fused_score is not None else 0.5
    raw_signals = raw_signals or {}
    context = context or {}
    
    return engine.apply_policy(fused_score, raw_signals, context)