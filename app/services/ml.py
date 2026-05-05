import math
import random
from dataclasses import dataclass
from typing import Dict, Iterable, List, Sequence, Tuple

from .data_utils import average


def _shuffle_split(
    rows: List[Dict[str, object]], test_ratio: float = 0.2, seed: int = 42
) -> Tuple[List[Dict[str, object]], List[Dict[str, object]]]:
    shuffled = list(rows)
    random.Random(seed).shuffle(shuffled)
    test_size = max(1, int(len(shuffled) * test_ratio))
    return shuffled[test_size:], shuffled[:test_size]


def _solve_linear_system(matrix: List[List[float]], vector: List[float]) -> List[float]:
    size = len(vector)
    augmented = [row[:] + [vector[index]] for index, row in enumerate(matrix)]

    for pivot_index in range(size):
        pivot_row = max(range(pivot_index, size), key=lambda row: abs(augmented[row][pivot_index]))
        augmented[pivot_index], augmented[pivot_row] = augmented[pivot_row], augmented[pivot_index]

        pivot = augmented[pivot_index][pivot_index]
        if abs(pivot) < 1e-10:
            raise ValueError("Model training failed because the feature matrix is singular.")

        scale = 1.0 / pivot
        augmented[pivot_index] = [value * scale for value in augmented[pivot_index]]

        for row_index in range(size):
            if row_index == pivot_index:
                continue
            factor = augmented[row_index][pivot_index]
            augmented[row_index] = [
                left - factor * right
                for left, right in zip(augmented[row_index], augmented[pivot_index])
            ]

    return [row[-1] for row in augmented]


def _root_mean_squared_error(actual: Sequence[float], predicted: Sequence[float]) -> float:
    if not actual:
        return 0.0
    mse = sum((truth - guess) ** 2 for truth, guess in zip(actual, predicted)) / len(actual)
    return math.sqrt(mse)


def _mean_absolute_error(actual: Sequence[float], predicted: Sequence[float]) -> float:
    if not actual:
        return 0.0
    return sum(abs(truth - guess) for truth, guess in zip(actual, predicted)) / len(actual)


def _r2_score(actual: Sequence[float], predicted: Sequence[float]) -> float:
    if not actual:
        return 0.0
    baseline = average(list(actual))
    ss_tot = sum((value - baseline) ** 2 for value in actual)
    ss_res = sum((truth - guess) ** 2 for truth, guess in zip(actual, predicted))
    if ss_tot == 0:
        return 1.0
    return 1 - (ss_res / ss_tot)


@dataclass
class RegressionMetrics:
    mae: float
    rmse: float
    r2: float

    def to_dict(self) -> Dict[str, float]:
        return {
            "mae": round(self.mae, 4),
            "rmse": round(self.rmse, 4),
            "r2": round(self.r2, 4),
        }


class FeatureEncoder:
    def __init__(self, numeric_fields: List[str], categorical_values: Dict[str, List[str]]):
        self.numeric_fields = numeric_fields
        self.categorical_values = categorical_values
        self.means: Dict[str, float] = {}
        self.stds: Dict[str, float] = {}
        self.feature_names: List[str] = ["intercept"]

    def fit(self, rows: List[Dict[str, object]]) -> None:
        for field in self.numeric_fields:
            values = [float(row[field]) for row in rows]
            mean = average(values)
            variance = sum((value - mean) ** 2 for value in values) / len(values)
            std = math.sqrt(variance) or 1.0
            self.means[field] = mean
            self.stds[field] = std

        self.feature_names = ["intercept"]
        self.feature_names.extend(self.numeric_fields)
        for field, values in self.categorical_values.items():
            for value in values:
                self.feature_names.append(f"{field}={value}")

    def transform_row(self, row: Dict[str, object]) -> List[float]:
        features = [1.0]
        for field in self.numeric_fields:
            raw_value = float(row[field])
            normalized = (raw_value - self.means[field]) / self.stds[field]
            features.append(normalized)

        for field, values in self.categorical_values.items():
            raw_value = str(row[field])
            for value in values:
                features.append(1.0 if raw_value == value else 0.0)

        return features

    def transform(self, rows: Iterable[Dict[str, object]]) -> List[List[float]]:
        return [self.transform_row(row) for row in rows]


class RidgeRegressor:
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

        self.weights = _solve_linear_system(xtx, xty)

    def predict_row(self, features: List[float]) -> float:
        return sum(weight * value for weight, value in zip(self.weights, features))

    def predict(self, features: List[List[float]]) -> List[float]:
        return [self.predict_row(row) for row in features]


class KnnRegressor:
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
        neighbors = distances[: self.neighbors]
        weighted_sum = 0.0
        total_weight = 0.0

        for distance, target in neighbors:
            weight = 1.0 / (distance + 1e-6)
            weighted_sum += weight * target
            total_weight += weight

        return weighted_sum / total_weight if total_weight else average(self.training_target)

    def predict(self, features: List[List[float]]) -> List[float]:
        return [self.predict_row(row) for row in features]


class TrainedRegressionModel:
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
        train_rows, test_rows = _shuffle_split(rows)

        self.encoder.fit(train_rows)
        train_features = self.encoder.transform(train_rows)
        train_target = [float(row[target_field]) for row in train_rows]
        test_features = self.encoder.transform(test_rows)
        actual = [float(row[target_field]) for row in test_rows]
        candidates = [
            ("ridge", RidgeRegressor(regularization=self.regularization)),
            ("knn", KnnRegressor(neighbors=min(31, len(train_rows)))),
        ]

        best_choice = None

        for name, candidate_model in candidates:
            candidate_model.fit(train_features, train_target)
            predicted = candidate_model.predict(test_features)
            metrics = RegressionMetrics(
                mae=_mean_absolute_error(actual, predicted),
                rmse=_root_mean_squared_error(actual, predicted),
                r2=_r2_score(actual, predicted),
            )

            if best_choice is None or metrics.rmse < best_choice[2].rmse:
                best_choice = (name, candidate_model, metrics)

        self.algorithm, self.model, self.metrics = best_choice

    def predict(self, row: Dict[str, object]) -> float:
        features = self.encoder.transform_row(row)
        return self.model.predict_row(features)
