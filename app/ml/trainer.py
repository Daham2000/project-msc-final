"""Trains a target column and keeps the better of the candidate algorithms."""

import random
from typing import Dict, List, Tuple

from .encoders import FeatureEncoder
from .metrics import RegressionMetrics
from .regressors import KnnRegressor, RidgeRegressor

TEST_RATIO = 0.2
RANDOM_SEED = 42
MAX_NEIGHBORS = 31


def train_test_split(
    rows: List[Dict[str, object]], test_ratio: float = TEST_RATIO, seed: int = RANDOM_SEED
) -> Tuple[List[Dict[str, object]], List[Dict[str, object]]]:
    """Shuffle with a fixed seed so every run reports comparable metrics."""
    shuffled = list(rows)
    random.Random(seed).shuffle(shuffled)
    test_size = max(1, int(len(shuffled) * test_ratio))
    return shuffled[test_size:], shuffled[:test_size]


class TrainedRegressionModel:
    """Encoder + winning regressor + its held-out metrics, as one unit."""

    def __init__(
        self,
        feature_fields: List[str],
        category_map: Dict[str, List[str]],
        regularization: float = 1.0,
    ):
        self.feature_fields = feature_fields
        self.category_map = category_map
        self.encoder = FeatureEncoder(feature_fields, category_map)
        self.model = RidgeRegressor(regularization=regularization)
        self.metrics = RegressionMetrics(mae=0.0, rmse=0.0, r2=0.0)
        self.algorithm = "ridge"
        self.regularization = regularization

    def fit(self, rows: List[Dict[str, object]], target_field: str) -> None:
        train_rows, test_rows = train_test_split(rows)

        self.encoder.fit(train_rows)
        train_features = self.encoder.transform(train_rows)
        train_target = [float(row[target_field]) for row in train_rows]
        test_features = self.encoder.transform(test_rows)
        actual = [float(row[target_field]) for row in test_rows]

        candidates = [
            ("ridge", RidgeRegressor(regularization=self.regularization)),
            ("knn", KnnRegressor(neighbors=min(MAX_NEIGHBORS, len(train_rows)))),
        ]

        best_choice = None
        for name, candidate_model in candidates:
            candidate_model.fit(train_features, train_target)
            metrics = RegressionMetrics.evaluate(actual, candidate_model.predict(test_features))

            # Lowest test RMSE wins; ties keep the first (simpler) candidate.
            if best_choice is None or metrics.rmse < best_choice[2].rmse:
                best_choice = (name, candidate_model, metrics)

        self.algorithm, self.model, self.metrics = best_choice

    def predict(self, row: Dict[str, object]) -> float:
        return self.model.predict_row(self.encoder.transform_row(row))
