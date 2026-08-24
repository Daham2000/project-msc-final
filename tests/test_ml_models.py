"""Unit tests for the machine-learning layer (app/ml/).

Covers the four pieces the prediction pipeline is built from: feature encoding,
the two regression algorithms, the evaluation metrics, and the trainer that
picks a winner between them. Synthetic data is used throughout, so these tests
never read the CSV dataset and never start the Flask app.
"""

import math

import pytest

from app.ml.encoders import FeatureEncoder
from app.ml.linear_algebra import solve_linear_system
from app.ml.metrics import (
    RegressionMetrics,
    mean_absolute_error,
    r2_score,
    root_mean_squared_error,
)
from app.ml.regressors import KnnRegressor, RidgeRegressor
from app.ml.trainer import TrainedRegressionModel, train_test_split


class TestFeatureEncoder:
    def test_intercept_is_the_first_feature(self):
        """Every row must start with 1.0 so the model can learn a bias term."""
        encoder = FeatureEncoder(["Age"], {})
        rows = [{"Age": 20.0}, {"Age": 40.0}]
        encoder.fit(rows)

        assert encoder.transform_row({"Age": 20.0})[0] == 1.0
        assert encoder.feature_names[0] == "intercept"

    def test_numeric_columns_are_standardised(self):
        """A value at the mean encodes to 0, one standard deviation up to 1."""
        encoder = FeatureEncoder(["Age"], {})
        encoder.fit([{"Age": 10.0}, {"Age": 20.0}, {"Age": 30.0}])

        assert encoder.means["Age"] == 20.0
        assert encoder.transform_row({"Age": 20.0})[1] == pytest.approx(0.0)
        assert encoder.transform_row({"Age": 30.0})[1] == pytest.approx(
            10.0 / encoder.stds["Age"]
        )

    def test_constant_column_does_not_divide_by_zero(self):
        """Zero variance falls back to a std of 1.0 instead of crashing."""
        encoder = FeatureEncoder(["Age"], {})
        encoder.fit([{"Age": 30.0}, {"Age": 30.0}])

        assert encoder.stds["Age"] == 1.0
        assert encoder.transform_row({"Age": 30.0})[1] == pytest.approx(0.0)

    def test_categorical_columns_are_one_hot_encoded(self):
        encoder = FeatureEncoder([], {"Mode_of_Transport": ["Car", "Walking"]})
        encoder.fit([{"Mode_of_Transport": "Car"}])

        assert encoder.transform_row({"Mode_of_Transport": "Car"}) == [1.0, 1.0, 0.0]
        assert encoder.transform_row({"Mode_of_Transport": "Walking"}) == [1.0, 0.0, 1.0]

    def test_unseen_category_encodes_as_all_zeros(self):
        """An unknown mode must not silently be read as a known one."""
        encoder = FeatureEncoder([], {"Mode_of_Transport": ["Car", "Walking"]})
        encoder.fit([{"Mode_of_Transport": "Car"}])

        assert encoder.transform_row({"Mode_of_Transport": "Helicopter"}) == [1.0, 0.0, 0.0]

    def test_feature_names_describe_every_column(self):
        encoder = FeatureEncoder(["Age"], {"Gender": ["Female", "Male"]})
        encoder.fit([{"Age": 30.0, "Gender": "Male"}, {"Age": 40.0, "Gender": "Female"}])

        assert encoder.feature_names == ["intercept", "Age", "Gender=Female", "Gender=Male"]

    def test_transform_returns_one_vector_per_row(self):
        encoder = FeatureEncoder(["Age"], {})
        rows = [{"Age": 10.0}, {"Age": 20.0}, {"Age": 30.0}]
        encoder.fit(rows)

        assert len(encoder.transform(rows)) == 3


class TestRidgeRegressor:
    def test_recovers_a_known_linear_relationship(self):
        """With no penalty the solver should reproduce y = 3 + 2x exactly."""
        features = [[1.0, x] for x in (0.0, 1.0, 2.0, 3.0, 4.0)]
        target = [3.0 + 2.0 * x for x in (0.0, 1.0, 2.0, 3.0, 4.0)]

        model = RidgeRegressor(regularization=0.0)
        model.fit(features, target)

        assert model.weights[0] == pytest.approx(3.0)
        assert model.weights[1] == pytest.approx(2.0)
        assert model.predict_row([1.0, 10.0]) == pytest.approx(23.0)

    def test_regularization_shrinks_the_slope(self):
        """A larger penalty must pull coefficients toward zero."""
        features = [[1.0, x] for x in (0.0, 1.0, 2.0, 3.0, 4.0)]
        target = [3.0 + 2.0 * x for x in (0.0, 1.0, 2.0, 3.0, 4.0)]

        weak = RidgeRegressor(regularization=0.0)
        strong = RidgeRegressor(regularization=100.0)
        weak.fit(features, target)
        strong.fit(features, target)

        assert abs(strong.weights[1]) < abs(weak.weights[1])

    def test_intercept_is_not_penalised(self):
        """The penalty skips index 0, so the bias survives a heavy alpha."""
        features = [[1.0, x] for x in (0.0, 1.0, 2.0, 3.0, 4.0)]
        target = [50.0] * 5

        model = RidgeRegressor(regularization=1000.0)
        model.fit(features, target)

        assert model.weights[0] == pytest.approx(50.0, rel=1e-6)

    def test_predict_handles_a_batch(self):
        model = RidgeRegressor(regularization=0.0)
        model.fit([[1.0, 0.0], [1.0, 1.0]], [1.0, 2.0])

        assert model.predict([[1.0, 0.0], [1.0, 1.0]]) == pytest.approx([1.0, 2.0])


class TestKnnRegressor:
    def test_exact_match_returns_that_neighbours_target(self):
        model = KnnRegressor(neighbors=1)
        model.fit([[1.0, 0.0], [1.0, 10.0]], [5.0, 99.0])

        assert model.predict_row([1.0, 0.0]) == pytest.approx(5.0, rel=1e-3)

    def test_closer_neighbours_carry_more_weight(self):
        """A point near 0.0 must land nearer 5.0 than the midpoint of 5 and 99."""
        model = KnnRegressor(neighbors=2)
        model.fit([[1.0, 0.0], [1.0, 10.0]], [5.0, 99.0])

        prediction = model.predict_row([1.0, 1.0])

        assert 5.0 < prediction < 52.0

    def test_falls_back_to_the_mean_when_there_is_no_signal(self):
        model = KnnRegressor(neighbors=3)
        model.fit([[1.0, 1.0], [1.0, 2.0], [1.0, 3.0]], [10.0, 20.0, 30.0])

        assert 10.0 <= model.predict_row([1.0, 2.0]) <= 30.0


class TestMetrics:
    def test_perfect_predictions_score_perfectly(self):
        actual = [1.0, 2.0, 3.0]

        assert mean_absolute_error(actual, actual) == 0.0
        assert root_mean_squared_error(actual, actual) == 0.0
        assert r2_score(actual, actual) == pytest.approx(1.0)

    def test_known_error_values(self):
        actual = [10.0, 20.0, 30.0]
        predicted = [12.0, 18.0, 33.0]

        assert mean_absolute_error(actual, predicted) == pytest.approx((2 + 2 + 3) / 3)
        assert root_mean_squared_error(actual, predicted) == pytest.approx(
            math.sqrt((4 + 4 + 9) / 3)
        )

    def test_rmse_punishes_large_errors_harder_than_mae(self):
        actual = [0.0, 0.0, 0.0, 0.0]
        predicted = [0.0, 0.0, 0.0, 8.0]

        assert root_mean_squared_error(actual, predicted) > mean_absolute_error(actual, predicted)

    def test_r2_is_zero_for_a_mean_only_prediction(self):
        actual = [10.0, 20.0, 30.0]
        predicted = [20.0, 20.0, 20.0]

        assert r2_score(actual, predicted) == pytest.approx(0.0)

    def test_empty_input_returns_zero_instead_of_crashing(self):
        assert mean_absolute_error([], []) == 0.0
        assert root_mean_squared_error([], []) == 0.0
        assert r2_score([], []) == 0.0

    def test_to_dict_rounds_for_the_api_response(self):
        metrics = RegressionMetrics(mae=0.123456, rmse=0.987654, r2=0.876543)

        assert metrics.to_dict() == {"mae": 0.1235, "rmse": 0.9877, "r2": 0.8765}

    def test_evaluate_builds_all_three_metrics_at_once(self):
        metrics = RegressionMetrics.evaluate([1.0, 2.0, 3.0], [1.0, 2.0, 3.0])

        assert (metrics.mae, metrics.rmse) == (0.0, 0.0)
        assert metrics.r2 == pytest.approx(1.0)


class TestTrainTestSplit:
    def test_split_uses_an_eighty_twenty_ratio(self):
        rows = [{"i": index} for index in range(100)]
        train, test = train_test_split(rows)

        assert (len(train), len(test)) == (80, 20)

    def test_split_is_deterministic_for_a_fixed_seed(self):
        """Reproducibility: reported metrics must be stable across runs."""
        rows = [{"i": index} for index in range(50)]

        assert train_test_split(rows, seed=42) == train_test_split(rows, seed=42)

    def test_train_and_test_sets_do_not_overlap(self):
        rows = [{"i": index} for index in range(50)]
        train, test = train_test_split(rows)

        train_ids = {row["i"] for row in train}
        test_ids = {row["i"] for row in test}

        assert train_ids.isdisjoint(test_ids)
        assert len(train_ids | test_ids) == 50

    def test_a_tiny_dataset_still_yields_a_test_row(self):
        train, test = train_test_split([{"i": 0}, {"i": 1}, {"i": 2}])

        assert len(test) >= 1


class TestTrainedRegressionModel:
    """End-to-end behaviour of the unit that the prediction service consumes."""

    @staticmethod
    def build_rows(count: int = 120):
        """y = 5 + 2*Age, with Car adding 10 - a signal both models can find."""
        rows = []
        for index in range(count):
            age = float(index % 60)
            mode = "Car" if index % 2 == 0 else "Walking"
            rows.append(
                {
                    "Age": age,
                    "Mode_of_Transport": mode,
                    "target": 5.0 + 2.0 * age + (10.0 if mode == "Car" else 0.0),
                }
            )
        return rows

    def test_fit_selects_an_algorithm_and_records_metrics(self):
        model = TrainedRegressionModel(["Age"], {"Mode_of_Transport": ["Car", "Walking"]})
        model.fit(self.build_rows(), "target")

        assert model.algorithm in {"ridge", "knn"}
        assert model.metrics.r2 > 0.9
        assert model.metrics.rmse >= 0.0

    def test_learns_the_transport_effect(self):
        """A car trip must predict higher than an identical walking trip."""
        model = TrainedRegressionModel(["Age"], {"Mode_of_Transport": ["Car", "Walking"]})
        model.fit(self.build_rows(), "target")

        car = model.predict({"Age": 30.0, "Mode_of_Transport": "Car"})
        walking = model.predict({"Age": 30.0, "Mode_of_Transport": "Walking"})

        assert car > walking

    def test_predict_returns_a_single_number(self):
        model = TrainedRegressionModel(["Age"], {"Mode_of_Transport": ["Car", "Walking"]})
        model.fit(self.build_rows(), "target")

        prediction = model.predict({"Age": 30.0, "Mode_of_Transport": "Car"})

        assert isinstance(prediction, float)
        assert prediction == pytest.approx(75.0, rel=0.15)

    def test_untrained_model_defaults_to_ridge_with_empty_metrics(self):
        model = TrainedRegressionModel(["Age"], {})

        assert model.algorithm == "ridge"
        assert model.metrics.to_dict() == {"mae": 0.0, "rmse": 0.0, "r2": 0.0}


class TestLinearSolver:
    def test_solves_a_small_system(self):
        # 2x + y = 5 ; x + 3y = 10  ->  x = 1, y = 3
        solution = solve_linear_system([[2.0, 1.0], [1.0, 3.0]], [5.0, 10.0])

        assert solution == pytest.approx([1.0, 3.0])

    def test_singular_matrix_raises_a_clear_error(self):
        """Duplicate rows mean no unique solution; fail loudly, not silently."""
        with pytest.raises(ValueError, match="singular"):
            solve_linear_system([[1.0, 2.0], [2.0, 4.0]], [3.0, 6.0])
