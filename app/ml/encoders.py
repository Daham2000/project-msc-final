"""Turns a raw citizen record into the numeric feature vector a model consumes."""

import math
from typing import Dict, Iterable, List

from .dataset import average


class FeatureEncoder:
    """Standardises numeric columns and one-hot encodes categorical ones.

    The scaling statistics are learned in ``fit`` from the training split only,
    so the held-out test rows never leak into the transform.
    """

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
            # A constant column has zero variance; fall back to 1.0 so the
            # division below stays defined.
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
            features.append((raw_value - self.means[field]) / self.stds[field])

        for field, values in self.categorical_values.items():
            raw_value = str(row[field])
            for value in values:
                features.append(1.0 if raw_value == value else 0.0)

        return features

    def transform(self, rows: Iterable[Dict[str, object]]) -> List[List[float]]:
        return [self.transform_row(row) for row in rows]
