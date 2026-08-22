"""Regression evaluation metrics, implemented without third-party libraries."""

import math
from dataclasses import dataclass
from typing import Dict, Sequence

from .dataset import average


def mean_absolute_error(actual: Sequence[float], predicted: Sequence[float]) -> float:
    if not actual:
        return 0.0
    return sum(abs(truth - guess) for truth, guess in zip(actual, predicted)) / len(actual)


def root_mean_squared_error(actual: Sequence[float], predicted: Sequence[float]) -> float:
    if not actual:
        return 0.0
    mse = sum((truth - guess) ** 2 for truth, guess in zip(actual, predicted)) / len(actual)
    return math.sqrt(mse)


def r2_score(actual: Sequence[float], predicted: Sequence[float]) -> float:
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

    @classmethod
    def evaluate(cls, actual: Sequence[float], predicted: Sequence[float]) -> "RegressionMetrics":
        return cls(
            mae=mean_absolute_error(actual, predicted),
            rmse=root_mean_squared_error(actual, predicted),
            r2=r2_score(actual, predicted),
        )

    def to_dict(self) -> Dict[str, float]:
        return {
            "mae": round(self.mae, 4),
            "rmse": round(self.rmse, 4),
            "r2": round(self.r2, 4),
        }
