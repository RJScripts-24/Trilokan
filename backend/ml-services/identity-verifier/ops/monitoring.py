import time
import logging
from collections import deque
from typing import Dict, Optional

class TrustMonitor:
    def __init__(self):
        self.logger = logging.getLogger("TrustMonitor")
        
        # Metrics Storage (In-memory simulation of Prometheus counters)
        self.metrics = {
            "verifications_total": 0,
            "verifications_failed": 0,
            "verifications_blocked": 0,
            "latency_sum": 0.0,
            # Phase 2: Deepfake-specific metrics
            "deepfake_detections": 0,
            "high_risk_verifications": 0,
            "manual_reviews_triggered": 0
        }
        
        # Drift Detection Windows
        self.score_window = deque(maxlen=100)  # Legacy risk scores
        self.deepfake_window = deque(maxlen=100)  # Phase 2: Deepfake probabilities

    def emit_metric(self, name: str, value: float = 1, tags: dict = None):
        """
        Records a metric event.
        Phase 2: Enhanced with additional metric types.
        """
        if name in self.metrics:
            self.metrics[name] += value
        else:
            self.metrics[name] = value
            
        # In a real app, this would push to StatsD or Prometheus
        # self.logger.debug(f"[METRIC] {name}: {value} {tags if tags else ''}")

    def track_verification(self, result: Dict):
        """
        Phase 2: Track verification result and update metrics.
        
        Args:
            result: Verification result dict from stage2
        """
        self.emit_metric("verifications_total")
        
        # Track deepfake probability
        video_fake_prob = result.get('video_fake_prob', 0.0)
        self.deepfake_window.append(video_fake_prob)
        
        # Track final score
        final_score = result.get('final_score', 0.0)
        self.score_window.append(final_score)
        
        # Track outcomes
        if not result.get('overall_pass', False):
            self.emit_metric("verifications_failed")
        
        if not result.get('deepfake_pass', False):
            self.emit_metric("deepfake_detections")
        
        # Track risk category
        risk_category = result.get('risk_category', 'LOW')
        if risk_category == 'HIGH':
            self.emit_metric("high_risk_verifications")
        
        # Track processing time
        processing_ms = result.get('processing_ms', 0.0)
        self.emit_metric("latency_sum", processing_ms)

    def check_drift(self, new_score: float):
        """
        Analyzes if the current risk scores are drifting significantly 
        from the recent average (indicating a potential mass-attack or model failure).
        """
        self.score_window.append(new_score)
        
        if len(self.score_window) >= 50:
            avg_score = sum(self.score_window) / len(self.score_window)
            
            # If the rolling average risk suddenly spikes > 0.8, alarm.
            if avg_score > 0.8:
                self.logger.warning(
                    f"DATA DRIFT ALARM: High average risk score detected ({avg_score:.2f}). Possible attack wave."
                )
    
    def alert_if_drift(self, threshold: float = 0.2, window_size: int = 100):
        """
        Phase 2: Alert if mean deepfake probability exceeds threshold over window.
        
        Args:
            threshold: Alert if mean video_fake_prob > threshold
            window_size: Number of recent verifications to consider
        """
        if len(self.deepfake_window) >= window_size:
            mean_fake_prob = sum(self.deepfake_window) / len(self.deepfake_window)
            
            if mean_fake_prob > threshold:
                self.logger.warning(
                    f"DEEPFAKE DRIFT ALERT: Mean video_fake_prob={mean_fake_prob:.3f} "
                    f"exceeds threshold {threshold} over last {window_size} verifications. "
                    "Potential model drift or coordinated attack."
                )
                return True
        return False

    def get_stats(self) -> Dict:
        """Get current monitoring statistics."""
        stats = self.metrics.copy()
        
        # Add computed metrics
        if stats['verifications_total'] > 0:
            stats['avg_latency_ms'] = stats['latency_sum'] / stats['verifications_total']
            stats['block_rate'] = stats['verifications_blocked'] / stats['verifications_total']
            stats['fail_rate'] = stats['verifications_failed'] / stats['verifications_total']
            stats['deepfake_detection_rate'] = stats['deepfake_detections'] / stats['verifications_total']
            stats['high_risk_rate'] = stats['high_risk_verifications'] / stats['verifications_total']
        
        return stats

_monitor = None

def get_monitor():
    global _monitor
    if _monitor is None:
        _monitor = TrustMonitor()
    return _monitor