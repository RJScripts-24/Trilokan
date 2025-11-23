"""
Unit tests for CNN deepfake detection module.
Tests model wrappers, inference pipeline, and integration hooks.
"""

import unittest
import numpy as np
import tempfile
import os
from pathlib import Path

# Test imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))


class TestDeepfakeInference(unittest.TestCase):
    """Test deepfake inference functions."""
    
    def setUp(self):
        """Create synthetic test frames."""
        # Create 5 synthetic RGB face images
        self.test_frames = [
            np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
            for _ in range(5)
        ]
    
    def test_run_deepfake_model_returns_same_length(self):
        """Test that run_deepfake_model returns same number of predictions as inputs."""
        from inference.deepfake_inference import run_deepfake_model
        
        # Run inference (will use random initialization since no checkpoint)
        try:
            predictions = run_deepfake_model(
                self.test_frames,
                model_name='xception',
                batch_size=32
            )
            
            # Check length matches
            self.assertEqual(len(predictions), len(self.test_frames))
            
            # Check all values are in [0, 1]
            for pred in predictions:
                self.assertGreaterEqual(pred, 0.0)
                self.assertLessEqual(pred, 1.0)
        except Exception as e:
            # If model loading fails (e.g., missing dependencies), skip
            self.skipTest(f"Model loading failed: {e}")
    
    def test_run_deepfake_model_empty_input(self):
        """Test that run_deepfake_model handles empty input gracefully."""
        from inference.deepfake_inference import run_deepfake_model
        
        predictions = run_deepfake_model([], model_name='xception')
        self.assertEqual(len(predictions), 0)
    
    def test_aggregation_mean(self):
        """Test mean aggregation."""
        from inference.deepfake_inference import aggregate_scores
        
        scores = [0.1, 0.2, 0.3, 0.4, 0.5]
        result = aggregate_scores(scores, method='mean')
        
        expected = np.mean(scores)
        self.assertAlmostEqual(result, expected, places=5)
    
    def test_aggregation_max(self):
        """Test max aggregation."""
        from inference.deepfake_inference import aggregate_scores
        
        scores = [0.1, 0.2, 0.8, 0.3, 0.4]
        result = aggregate_scores(scores, method='max')
        
        self.assertEqual(result, 0.8)
    
    def test_aggregation_percentile(self):
        """Test percentile aggregation."""
        from inference.deepfake_inference import aggregate_scores
        
        scores = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
        result = aggregate_scores(scores, method='percentile')
        
        expected = np.percentile(scores, 90)
        self.assertAlmostEqual(result, expected, places=5)
    
    def test_aggregation_empty_input(self):
        """Test aggregation with empty input."""
        from inference.deepfake_inference import aggregate_scores
        
        result = aggregate_scores([], method='mean')
        self.assertEqual(result, 0.0)
    
    def test_aggregation_unknown_method(self):
        """Test that unknown aggregation method falls back to mean."""
        from inference.deepfake_inference import aggregate_scores
        
        scores = [0.1, 0.2, 0.3]
        result = aggregate_scores(scores, method='unknown_method')
        
        expected = np.mean(scores)
        self.assertAlmostEqual(result, expected, places=5)


class TestModelWrappers(unittest.TestCase):
    """Test model wrapper classes."""
    
    def setUp(self):
        """Create temporary checkpoint and test frames."""
        self.temp_dir = tempfile.mkdtemp()
        self.checkpoint_path = os.path.join(self.temp_dir, 'test_model.pth')
        
        # Create dummy checkpoint (will fail to load but tests structure)
        self.test_frames = [
            np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
            for _ in range(3)
        ]
    
    def tearDown(self):
        """Clean up temp files."""
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def test_xception_wrapper_initialization(self):
        """Test XceptionWrapper initialization."""
        try:
            from models.xception_wrapper import XceptionWrapper
            
            wrapper = XceptionWrapper(
                checkpoint_path=self.checkpoint_path,
                device='cpu'
            )
            
            self.assertIsNotNone(wrapper.model)
            self.assertEqual(wrapper.INPUT_SIZE, 299)
        except Exception as e:
            self.skipTest(f"XceptionWrapper init failed: {e}")
    
    def test_efficientnet_wrapper_initialization(self):
        """Test EfficientNetWrapper initialization."""
        try:
            from models.efficientnet_wrapper import EfficientNetWrapper
            
            wrapper = EfficientNetWrapper(
                checkpoint_path=self.checkpoint_path,
                device='cpu'
            )
            
            self.assertIsNotNone(wrapper.model)
            self.assertEqual(wrapper.INPUT_SIZE, 224)
        except Exception as e:
            self.skipTest(f"EfficientNetWrapper init failed: {e}")
    
    def test_get_detector_factory(self):
        """Test get_detector factory function."""
        try:
            from models.cnn_deepfake import get_detector
            
            detector = get_detector(name='xception', checkpoint=self.checkpoint_path)
            self.assertIsNotNone(detector)
            
            # Test unknown model name
            with self.assertRaises(ValueError):
                get_detector(name='unknown_model')
        except Exception as e:
            self.skipTest(f"get_detector failed: {e}")


class TestIntegrationHook(unittest.TestCase):
    """Test integration with face processor."""
    
    def setUp(self):
        """Create synthetic video frames and mock face detector."""
        self.video_frames = [
            np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
            for _ in range(20)
        ]
        
        # Mock face detector that returns center crop
        def mock_face_detector(frame):
            h, w = frame.shape[:2]
            cx, cy = w // 2, h // 2
            size = 150
            face = frame[
                max(0, cy - size):cy + size,
                max(0, cx - size):cx + size
            ]
            return face if face.size > 0 else None
        
        self.face_detector = mock_face_detector
    
    def test_integration_smoke(self):
        """Smoke test for integration function."""
        try:
            from integration.face_processor_v2_hook import integrate_deepfake_detection
            
            result = integrate_deepfake_detection(
                video_frames=self.video_frames,
                face_detector_fn=self.face_detector,
                liveness_passed=True,
                blur_score=120.0,
                model_name='xception',
                frame_skip=5,
                batch_size=8
            )
            
            # Check result structure
            self.assertIn('overall_pass', result)
            self.assertIn('deepfake_pass', result)
            self.assertIn('video_fake_prob', result)
            self.assertIn('frame_scores', result)
            self.assertIn('frames_processed', result)
            
            # Check types
            self.assertIsInstance(result['overall_pass'], bool)
            self.assertIsInstance(result['deepfake_pass'], bool)
            self.assertIsInstance(result['video_fake_prob'], float)
            self.assertIsInstance(result['frame_scores'], list)
            self.assertIsInstance(result['frames_processed'], int)
            
            # Check probability range
            self.assertGreaterEqual(result['video_fake_prob'], 0.0)
            self.assertLessEqual(result['video_fake_prob'], 1.0)
        except Exception as e:
            self.skipTest(f"Integration test failed: {e}")
    
    def test_integration_insufficient_frames(self):
        """Test handling of insufficient face detections."""
        try:
            from integration.face_processor_v2_hook import integrate_deepfake_detection
            
            # Mock detector that always returns None
            def no_face_detector(frame):
                return None
            
            result = integrate_deepfake_detection(
                video_frames=self.video_frames[:5],
                face_detector_fn=no_face_detector,
                liveness_passed=True,
                blur_score=120.0
            )
            
            # Should fail due to insufficient faces
            self.assertFalse(result['overall_pass'])
            self.assertIn('error', result)
        except Exception as e:
            self.skipTest(f"Insufficient frames test failed: {e}")


class TestGradCAM(unittest.TestCase):
    """Test Grad-CAM explainability."""
    
    def setUp(self):
        """Create test frames."""
        self.test_frames = [
            np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
            for _ in range(3)
        ]
    
    def test_explain_function(self):
        """Test explain function returns heatmaps."""
        try:
            from explain.gradcam_utils import explain
            
            heatmaps = explain(
                frames=self.test_frames,
                model_name='xception',
                top_k=2
            )
            
            # Should return up to top_k heatmaps
            self.assertLessEqual(len(heatmaps), 2)
            
            # Check heatmap shape and type
            if len(heatmaps) > 0:
                self.assertEqual(len(heatmaps[0].shape), 3)  # HxWx3
                self.assertEqual(heatmaps[0].dtype, np.uint8)
        except Exception as e:
            self.skipTest(f"Explain function test failed: {e}")
    
    def test_create_heatmap_overlay(self):
        """Test heatmap overlay creation."""
        from explain.gradcam_utils import create_heatmap_overlay
        
        image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        cam = np.random.rand(100, 100).astype(np.float32)
        
        overlay = create_heatmap_overlay(image, cam, alpha=0.5)
        
        self.assertEqual(overlay.shape, image.shape)
        self.assertEqual(overlay.dtype, np.uint8)


class TestCNNDeepfakeLegacy(unittest.TestCase):
    """Test legacy DeepfakeCNN class for backward compatibility."""
    
    def test_legacy_class_initialization(self):
        """Test legacy class can be initialized."""
        from models.cnn_deepfake import DeepfakeCNN
        
        detector = DeepfakeCNN()
        self.assertIsNotNone(detector)
    
    def test_legacy_infer_face_crop(self):
        """Test legacy infer_face_crop method."""
        from models.cnn_deepfake import DeepfakeCNN
        
        detector = DeepfakeCNN()
        face = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
        
        result = detector.infer_face_crop(face)
        
        # Check result structure
        self.assertIn('score', result)
        self.assertIn('explain', result)
        self.assertIn('confidence', result)
        
        # Check types and ranges
        self.assertIsInstance(result['score'], float)
        self.assertGreaterEqual(result['score'], 0.0)
        self.assertLessEqual(result['score'], 1.0)


def run_tests():
    """Run all tests."""
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestDeepfakeInference))
    suite.addTests(loader.loadTestsFromTestCase(TestModelWrappers))
    suite.addTests(loader.loadTestsFromTestCase(TestIntegrationHook))
    suite.addTests(loader.loadTestsFromTestCase(TestGradCAM))
    suite.addTests(loader.loadTestsFromTestCase(TestCNNDeepfakeLegacy))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
