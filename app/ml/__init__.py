"""Machine-learning layer: dataset loading, domain equations, and models."""

from .dataset import (
    CARBON_TARGET,
    CATEGORICAL_FIELDS,
    ENERGY_TARGET,
    IDENTIFIER_FIELD,
    NUMERIC_FIELDS,
    average,
    collect_categories,
    load_dataset,
)
from .metrics import RegressionMetrics
from .trainer import TrainedRegressionModel

__all__ = [
    "CARBON_TARGET",
    "CATEGORICAL_FIELDS",
    "ENERGY_TARGET",
    "IDENTIFIER_FIELD",
    "NUMERIC_FIELDS",
    "RegressionMetrics",
    "TrainedRegressionModel",
    "average",
    "collect_categories",
    "load_dataset",
]
