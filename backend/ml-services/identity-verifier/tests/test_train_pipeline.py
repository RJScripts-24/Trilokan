"""
Smoke test for the training pipeline.
"""
import unittest
from training import extract_features, train_fusion, calibrate

class TestTrainPipeline(unittest.TestCase):
    def test_pipeline(self):
        # TODO: Use a tiny dataset for smoke test
        dataset_root = 'data/datasets/train'  # Should be the root, not a CSV
        output_csv = 'data/feature_csvs/train_features_test.csv'  # Dummy output
        features_csv = extract_features.run_on_dataset(dataset_root, output_csv)
        labels_csv = None  # TODO: Provide path to labels CSV
        model_artifact = train_fusion.train(features_csv, labels_csv, 'model.pkl')
        val_features = 'data/feature_csvs/val_features.csv'
        calibration_params = calibrate.calibrate_model(model_artifact, val_features)
        # TODO: Add real assertions
        self.assertIsNone(features_csv)
        self.assertIsNone(model_artifact)
        self.assertIsNone(calibration_params)

if __name__ == "__main__":
    unittest.main()
