"""The candidate learning algorithms, written from scratch.

Both expose the same ``fit`` / ``predict_row`` / ``predict`` interface so the
trainer can compare them interchangeably.
"""

import math
from typing import List

from .dataset import average
from .linear_algebra import solve_linear_system


class RidgeRegressor:
    """Linear regression with L2 regularisation, solved in closed form.

    Solves ``(XtX + lambda*I) w = Xty``. The penalty skips index 0 so the
    intercept is never shrunk toward zero.
    """

    def __init__(self, regularization: float = 1.0):
        self.regularization = regularization
        self.weights: List[float] = []

    def fit(self, features: List[List[float]], target: List[float]) -> None:
        feature_count = len(features[0])
        xtx = [[0.0 for _ in range(feature_count)] for _ in range(feature_count)]
        xty = [0.0 for _ in range(feature_count)]

        for row_features, row_target in zip(features, target):
            for left_index in range(feature_count):
                xty[left_index] += row_features[left_index] * row_target
                for right_index in range(feature_count):
                    xtx[left_index][right_index] += (
                        row_features[left_index] * row_features[right_index]
                    )

        for index in range(1, feature_count):
            xtx[index][index] += self.regularization

        self.weights = solve_linear_system(xtx, xty)

    def predict_row(self, features: List[float]) -> float:
        return sum(weight * value for weight, value in zip(self.weights, features))

    def predict(self, features: List[List[float]]) -> List[float]:
        return [self.predict_row(row) for row in features]


class KnnRegressor:
    """Distance-weighted k-nearest-neighbours regression.

    Captures non-linear patterns the ridge model cannot, at the cost of scoring
    every training row on each prediction.
    """

    def __init__(self, neighbors: int = 31):
        self.neighbors = neighbors
        self.training_features: List[List[float]] = []
        self.training_target: List[float] = []

    def fit(self, features: List[List[float]], target: List[float]) -> None:
        self.training_features = list(features)
        self.training_target = list(target)

    def predict_row(self, features: List[float]) -> float:
        distances = []
        for row_features, row_target in zip(self.training_features, self.training_target):
            distance = math.sqrt(
                sum((left - right) ** 2 for left, right in zip(features, row_features))
            )
            distances.append((distance, row_target))

        distances.sort(key=lambda item: item[0])
        weighted_sum = 0.0
        total_weight = 0.0

        for distance, target in distances[: self.neighbors]:
            # +1e-6 keeps an exact match from producing an infinite weight.
            weight = 1.0 / (distance + 1e-6)
            weighted_sum += weight * target
            total_weight += weight

        return weighted_sum / total_weight if total_weight else average(self.training_target)

    def predict(self, features: List[List[float]]) -> List[float]:
        return [self.predict_row(row) for row in features]
