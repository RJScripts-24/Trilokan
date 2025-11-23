#!/usr/bin/env python3
"""
Demo Script for CNN Deepfake Detection Pipeline

This script demonstrates the full Phase 2 pipeline:
1. Video ingestion
2. Stage 1 lightweight checks
3. Stage 2 ML/DL checks (including CNN deepfake detection)
4. Fusion scoring
5. Policy engine decision

Usage:
    python demo/run_demo.py --video path/to/video.mp4
    python demo/run_demo.py --video path/to/video.mp4 --model efficientnet
    python demo/run_demo.py --video path/to/video.mp4 --save-heatmaps --output-dir ./demo_output
"""

import argparse
import os
import sys
import time
import json
import logging
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from ingest.capture import IngestCapture
    from pipeline.stage1 import run_stage1
    from pipeline.stage2 import run_stage2
    from models.policy_engine import get_policy_engine
    from models.fusion_scorer import get_fusion_scorer
    PIPELINE_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Pipeline modules not fully available: {e}")
    PIPELINE_AVAILABLE = False

try:
    from explain.gradcam_utils import generate_gradcam_heatmap, save_heatmap
    GRADCAM_AVAILABLE = True
except ImportError:
    print("Warning: Grad-CAM explainability not available")
    GRADCAM_AVAILABLE = False

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_demo(video_path: str, model_name: str = 'xception', 
             save_heatmaps: bool = False, output_dir: str = './demo_output',
             user_id: str = 'demo_user', action: str = 'login'):
    """
    Run the full verification pipeline on a video file.
    
    Args:
        video_path: Path to input video file
        model_name: CNN model to use (xception or efficientnet)
        save_heatmaps: Whether to generate and save Grad-CAM heatmaps
        output_dir: Directory to save outputs
        user_id: User ID for policy context
        action: Action type for policy context (login, profile_update, high_value_tx)
    
    Returns:
        dict: Final verification results
    """
    if not PIPELINE_AVAILABLE:
        logger.error("Pipeline modules not available. Cannot run demo.")
        return None
    
    if not os.path.exists(video_path):
        logger.error(f"Video file not found: {video_path}")
        return None
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    logger.info("=" * 80)
    logger.info("CNN Deepfake Detection Pipeline - Demo Run")
    logger.info("=" * 80)
    logger.info(f"Video: {video_path}")
    logger.info(f"Model: {model_name}")
    logger.info(f"User: {user_id}, Action: {action}")
    logger.info("")
    
    start_time = time.time()
    
    try:
        # Stage 0: Ingestion
        logger.info("[Stage 0] Video Ingestion")
        logger.info("-" * 80)
        capture = IngestCapture(video_path=video_path)
        logger.info(f"✓ Video loaded: {capture.total_frames} frames, {capture.fps:.1f} FPS")
        logger.info("")
        
        # Stage 1: Lightweight checks
        logger.info("[Stage 1] Lightweight Quality Checks")
        logger.info("-" * 80)
        stage1_start = time.time()
        stage1_result = run_stage1(capture)
        stage1_time = (time.time() - stage1_start) * 1000
        
        logger.info(f"Pass: {stage1_result.get('pass', False)}")
        logger.info(f"Audit ID: {stage1_result.get('audit_id')}")
        if not stage1_result.get('pass', False):
            logger.warning(f"Reason: {stage1_result.get('reason')}")
            logger.warning("Stage 1 failed. Stopping pipeline.")
            return stage1_result
        logger.info(f"Processing time: {stage1_time:.1f}ms")
        logger.info("")
        
        # Stage 2: ML/DL checks
        logger.info("[Stage 2] ML/DL Checks (Deepfake + Fusion)")
        logger.info("-" * 80)
        stage2_start = time.time()
        context = {
            'user_id': user_id,
            'action': action,
            'model_name': model_name
        }
        stage2_result = run_stage2(capture, stage1_result, video_path, context)
        stage2_time = (time.time() - stage2_start) * 1000
        
        logger.info(f"Video Fake Probability: {stage2_result.get('video_fake_prob', 0.0):.4f}")
        logger.info(f"Deepfake Pass: {stage2_result.get('deepfake_pass', False)}")
        logger.info(f"Final Fusion Score: {stage2_result.get('final_score', 0.0):.4f}")
        logger.info(f"Overall Pass: {stage2_result.get('overall_pass', False)}")
        
        # Print fusion breakdown
        fusion_breakdown = stage2_result.get('fusion_breakdown', {})
        if fusion_breakdown:
            logger.info("\nFusion Score Breakdown:")
            for signal, value in fusion_breakdown.items():
                logger.info(f"  {signal}: {value:.4f}")
        
        logger.info(f"\nProcessing time: {stage2_time:.1f}ms")
        logger.info("")
        
        # Policy Engine
        logger.info("[Policy Engine] Final Decision")
        logger.info("-" * 80)
        policy = get_policy_engine()
        
        raw_signals = {
            'video_fake_prob': stage2_result.get('video_fake_prob', 0.0),
            'liveness_ok': stage2_result.get('signals', {}).get('liveness_ok', True),
            'blur_score': stage2_result.get('signals', {}).get('blur_score', 100.0),
            'rppg_ok': stage2_result.get('signals', {}).get('rppg_ok', True)
        }
        
        policy_result = policy.apply_policy(
            fused_score=stage2_result.get('final_score', 0.0),
            raw_signals=raw_signals,
            context=context
        )
        
        logger.info(f"Decision: {policy_result.get('final_decision')}")
        logger.info(f"Risk Category: {policy_result.get('risk_category')}")
        logger.info(f"Action Code: {policy_result.get('action_code')}")
        logger.info(f"Reasons: {', '.join(policy_result.get('reasons', []))}")
        logger.info("")
        
        # Generate Grad-CAM heatmaps (if requested and available)
        if save_heatmaps and GRADCAM_AVAILABLE:
            logger.info("[Explainability] Generating Grad-CAM Heatmaps")
            logger.info("-" * 80)
            try:
                from inference.deepfake_inference import run_deepfake_model
                from ingest.frame_utils import extract_frames
                
                # Extract sample frames
                frames = extract_frames(video_path, max_frames=10, frame_skip=5)
                if frames:
                    heatmap_dir = os.path.join(output_dir, 'heatmaps')
                    os.makedirs(heatmap_dir, exist_ok=True)
                    
                    # Generate heatmaps for first few frames
                    for idx, frame in enumerate(frames[:3]):
                        heatmap_path = os.path.join(heatmap_dir, f'frame_{idx}_heatmap.png')
                        heatmap = generate_gradcam_heatmap(
                            model_name=model_name,
                            frame=frame,
                            target_layer=None  # Auto-detect
                        )
                        save_heatmap(frame, heatmap, heatmap_path)
                        logger.info(f"✓ Saved heatmap: {heatmap_path}")
                    
                    logger.info(f"Generated {min(3, len(frames))} Grad-CAM heatmaps")
                else:
                    logger.warning("No frames extracted for heatmap generation")
            except Exception as e:
                logger.warning(f"Could not generate heatmaps: {e}")
            logger.info("")
        
        # Summary
        total_time = (time.time() - start_time) * 1000
        logger.info("=" * 80)
        logger.info("SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Total Processing Time: {total_time:.1f}ms")
        logger.info(f"  - Stage 1: {stage1_time:.1f}ms ({stage1_time/total_time*100:.1f}%)")
        logger.info(f"  - Stage 2: {stage2_time:.1f}ms ({stage2_time/total_time*100:.1f}%)")
        logger.info("")
        logger.info(f"Final Decision: {policy_result.get('final_decision')}")
        logger.info(f"Overall Pass: {stage2_result.get('overall_pass', False)}")
        logger.info(f"Video Deepfake Probability: {stage2_result.get('video_fake_prob', 0.0):.4f}")
        logger.info(f"Fusion Score: {stage2_result.get('final_score', 0.0):.4f}")
        logger.info("=" * 80)
        
        # Save results to JSON
        results = {
            'video_path': video_path,
            'model_name': model_name,
            'user_id': user_id,
            'action': action,
            'stage1': stage1_result,
            'stage2': stage2_result,
            'policy': policy_result,
            'timings': {
                'total_ms': total_time,
                'stage1_ms': stage1_time,
                'stage2_ms': stage2_time
            }
        }
        
        results_path = os.path.join(output_dir, 'demo_results.json')
        with open(results_path, 'w') as f:
            json.dump(results, f, indent=2)
        logger.info(f"\n✓ Results saved to: {results_path}")
        
        return results
        
    except Exception as e:
        logger.error(f"Error during demo execution: {e}", exc_info=True)
        return None


def main():
    parser = argparse.ArgumentParser(
        description='Demo script for CNN Deepfake Detection Pipeline',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python demo/run_demo.py --video data/test_video.mp4
  python demo/run_demo.py --video data/test_video.mp4 --model efficientnet
  python demo/run_demo.py --video data/test_video.mp4 --save-heatmaps
  python demo/run_demo.py --video data/test_video.mp4 --action high_value_tx
        """
    )
    
    parser.add_argument(
        '--video',
        type=str,
        required=True,
        help='Path to input video file'
    )
    
    parser.add_argument(
        '--model',
        type=str,
        default='xception',
        choices=['xception', 'efficientnet'],
        help='CNN model to use for deepfake detection (default: xception)'
    )
    
    parser.add_argument(
        '--save-heatmaps',
        action='store_true',
        help='Generate and save Grad-CAM heatmaps for explainability'
    )
    
    parser.add_argument(
        '--output-dir',
        type=str,
        default='./demo_output',
        help='Directory to save output files (default: ./demo_output)'
    )
    
    parser.add_argument(
        '--user-id',
        type=str,
        default='demo_user',
        help='User ID for policy context (default: demo_user)'
    )
    
    parser.add_argument(
        '--action',
        type=str,
        default='login',
        choices=['login', 'profile_update', 'high_value_tx'],
        help='Action type for policy context (default: login)'
    )
    
    args = parser.parse_args()
    
    # Run demo
    results = run_demo(
        video_path=args.video,
        model_name=args.model,
        save_heatmaps=args.save_heatmaps,
        output_dir=args.output_dir,
        user_id=args.user_id,
        action=args.action
    )
    
    if results is None:
        logger.error("Demo failed")
        sys.exit(1)
    else:
        logger.info("\n✓ Demo completed successfully")
        sys.exit(0)


if __name__ == '__main__':
    main()
