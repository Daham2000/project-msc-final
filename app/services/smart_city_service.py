from collections import Counter
from typing import Dict, List

from ..ml import (
    CARBON_TARGET,
    CATEGORICAL_FIELDS,
    ENERGY_TARGET,
    IDENTIFIER_FIELD,
    NUMERIC_FIELDS,
    TrainedRegressionModel,
    average,
    collect_categories,
    load_dataset,
)
from ..ml.domain_model import carbon_footprint_kg, home_energy_kwh
from .recommendation_service import citizen_recommendations, sustainability_band


ENERGY_FEATURES = list(NUMERIC_FIELDS)
CARBON_FEATURES = list(NUMERIC_FIELDS) + [ENERGY_TARGET]
DAYS_PER_MONTH = 30

# The learned models capture behavioural variation the equations do not, but the
# equations guarantee physically correct ordering (a walker can never be charged
# for vehicle emissions). Blending keeps both properties.
MODEL_WEIGHT = 0.6
DOMAIN_WEIGHT = 1.0 - MODEL_WEIGHT

# How far a learned prediction may drift from the physical estimate before it is
# clipped back. Wide enough to keep model signal, tight enough to stop a linear
# extrapolation from returning a negative or absurd value.
PLAUSIBLE_LOWER_RATIO = 0.55
PLAUSIBLE_UPPER_RATIO = 1.75


def _bounded_prediction(value: float) -> float:
    return max(value, 0.0)


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return min(max(value, minimum), maximum)


def _has_energy_override(payload: Dict[str, object]) -> bool:
    return payload.get(ENERGY_TARGET) not in (None, "")


def _blend_with_domain(model_value: float, domain_value: float) -> float:
    """Anchor a learned prediction to its physical estimate."""
    blended = (model_value * MODEL_WEIGHT) + (domain_value * DOMAIN_WEIGHT)
    return _clamp(
        blended,
        domain_value * PLAUSIBLE_LOWER_RATIO,
        domain_value * PLAUSIBLE_UPPER_RATIO,
    )


def _adjust_energy_prediction(model_energy: float, citizen: Dict[str, object]) -> float:
    return _blend_with_domain(model_energy, home_energy_kwh(citizen))


def _adjust_carbon_prediction(
    model_carbon: float, citizen: Dict[str, object], energy_kwh: float
) -> float:
    return _blend_with_domain(model_carbon, carbon_footprint_kg(citizen, energy_kwh=energy_kwh))


def _period_metrics(energy_value: float, carbon_value: float) -> Dict[str, Dict[str, float]]:
    bounded_energy = _bounded_prediction(energy_value)
    bounded_carbon = _bounded_prediction(carbon_value)
    return {
        "daily_average": {
            "predicted_energy_consumption_kwh": round(bounded_energy, 2),
            "predicted_carbon_footprint_kgco2": round(bounded_carbon, 2),
        },
        "monthly_average": {
            "predicted_energy_consumption_kwh": round(bounded_energy * DAYS_PER_MONTH, 2),
            "predicted_carbon_footprint_kgco2": round(bounded_carbon * DAYS_PER_MONTH, 2),
        },
    }


class SmartCityService:
    def __init__(self, dataset_path: str):
        self.dataset_path = dataset_path
        self.records = load_dataset(dataset_path)
        self.dataset_size = len(self.records)
        self.category_map = collect_categories(self.records)
        self.energy_model = TrainedRegressionModel(ENERGY_FEATURES, self.category_map, regularization=1.5)
        self.carbon_model = TrainedRegressionModel(CARBON_FEATURES, self.category_map, regularization=1.5)
        self.is_trained = False
        self._dashboard_summary: Dict[str, object] | None = None

    def train(self) -> None:
        self.energy_model.fit(self.records, ENERGY_TARGET)
        self.carbon_model.fit(self.records, CARBON_TARGET)
        self.is_trained = True
        self._dashboard_summary = None

    def get_metadata(self) -> Dict[str, object]:
        return {
            "dataset_path": self.dataset_path,
            "records_loaded": self.dataset_size,
            "accepted_genders": self.category_map["Gender"],
            "accepted_transport_modes": self.category_map["Mode_of_Transport"],
            "required_prediction_fields": {
                "Age": "number",
                "Gender": "string",
                "Mode_of_Transport": "string",
                "Work_Hours": "number",
                "Shopping_Hours": "number",
                "Entertainment_Hours": "number",
                "Charging_Station_Usage": "0 or 1",
                "Steps_Walked": "number",
                "Calories_Burned": "number",
                "Sleep_Hours": "number",
                "Social_Media_Hours": "number",
                "Public_Events_Hours": "number",
                "Home_Energy_Consumption_kWh": "optional number override",
            },
            "model_metrics": {
                "energy_prediction": {
                    "algorithm": self.energy_model.algorithm,
                    **self.energy_model.metrics.to_dict(),
                },
                "carbon_prediction": {
                    "algorithm": self.carbon_model.algorithm,
                    **self.carbon_model.metrics.to_dict(),
                },
            },
        }

    def _sanitize_payload(self, payload: Dict[str, object]) -> Dict[str, object]:
        required_fields = [
            "Age",
            "Gender",
            "Mode_of_Transport",
            "Work_Hours",
            "Shopping_Hours",
            "Entertainment_Hours",
            "Charging_Station_Usage",
            "Steps_Walked",
            "Calories_Burned",
            "Sleep_Hours",
            "Social_Media_Hours",
            "Public_Events_Hours",
        ]

        missing = [field for field in required_fields if field not in payload]
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")

        sanitized = {IDENTIFIER_FIELD: float(payload.get(IDENTIFIER_FIELD, 0) or 0)}

        for field in NUMERIC_FIELDS:
            try:
                sanitized[field] = float(payload[field])
            except (TypeError, ValueError, KeyError):
                raise ValueError(f"Field '{field}' must be numeric.") from None

        for field in CATEGORICAL_FIELDS:
            raw_value = str(payload[field]).strip()
            if raw_value not in self.category_map[field]:
                accepted = ", ".join(self.category_map[field])
                raise ValueError(f"Field '{field}' must be one of: {accepted}")
            sanitized[field] = raw_value

        home_energy = payload.get(ENERGY_TARGET)
        if home_energy not in (None, ""):
            try:
                sanitized[ENERGY_TARGET] = float(home_energy)
            except (TypeError, ValueError):
                raise ValueError(f"Field '{ENERGY_TARGET}' must be numeric when provided.") from None
        else:
            sanitized[ENERGY_TARGET] = 0.0

        sanitized[CARBON_TARGET] = 0.0
        return sanitized

    def predict_citizen(self, payload: Dict[str, object]) -> Dict[str, object]:
        citizen = self._sanitize_payload(payload)

        has_energy_override = _has_energy_override(payload)
        model_energy = self.energy_model.predict(citizen)
        predicted_energy = citizen[ENERGY_TARGET] if has_energy_override else _adjust_energy_prediction(model_energy, citizen)
        citizen[ENERGY_TARGET] = predicted_energy
        predicted_carbon = _adjust_carbon_prediction(
            self.carbon_model.predict(citizen), citizen, predicted_energy
        )
        bounded_energy = _bounded_prediction(predicted_energy)
        bounded_carbon = _bounded_prediction(predicted_carbon)

        recommendations = citizen_recommendations(citizen)

        return {
            "citizen_id": int(citizen[IDENTIFIER_FIELD]) if citizen[IDENTIFIER_FIELD] else None,
            "inputs": {
                key: citizen[key]
                for key in NUMERIC_FIELDS + CATEGORICAL_FIELDS + [ENERGY_TARGET]
            },
            "predictions": {
                "predicted_energy_consumption_kwh": round(bounded_energy, 2),
                "predicted_carbon_footprint_kgco2": round(bounded_carbon, 2),
                "sustainability_band": sustainability_band(bounded_carbon),
                **_period_metrics(predicted_energy, predicted_carbon),
            },
            "recommendations": recommendations,
        }

    def predict_city(self, citizens: List[Dict[str, object]]) -> Dict[str, object]:
        citizen_results = [self.predict_citizen(citizen) for citizen in citizens]
        carbon_predictions = [
            result["predictions"]["predicted_carbon_footprint_kgco2"] for result in citizen_results
        ]
        energy_predictions = [
            result["predictions"]["predicted_energy_consumption_kwh"] for result in citizen_results
        ]

        return {
            "citizens_analyzed": len(citizen_results),
            "average_predicted_carbon_kgco2": round(average(carbon_predictions), 2),
            "average_predicted_energy_kwh": round(average(energy_predictions), 2),
            "average_per_person": _period_metrics(
                average(energy_predictions),
                average(carbon_predictions),
            ),
            "total_predicted_carbon_kgco2": round(sum(carbon_predictions), 2),
            "total_predicted_energy_kwh": round(sum(energy_predictions), 2),
            "citizen_predictions": citizen_results,
        }

    def get_dashboard_summary(self) -> Dict[str, object]:
        if self._dashboard_summary is not None:
            return self._dashboard_summary

        predicted_carbons: List[float] = []
        predicted_energies: List[float] = []
        transport_counter: Counter = Counter()

        for record in self.records:
            working = dict(record)
            model_energy = self.energy_model.predict(working)
            predicted_energy = _adjust_energy_prediction(model_energy, working)
            working[ENERGY_TARGET] = predicted_energy
            predicted_carbon = _adjust_carbon_prediction(
                self.carbon_model.predict(working), working, predicted_energy
            )
            predicted_energies.append(max(predicted_energy, 0.0))
            predicted_carbons.append(max(predicted_carbon, 0.0))
            transport_counter[str(record["Mode_of_Transport"])] += 1

        most_common_transport = transport_counter.most_common(1)[0][0] if transport_counter else None

        self._dashboard_summary = {
            "citizens_profiled": self.dataset_size,
            "average_predicted_carbon_kgco2": round(average(predicted_carbons), 2),
            "average_predicted_energy_kwh": round(average(predicted_energies), 2),
            "total_city_carbon_kgco2": round(sum(predicted_carbons), 2),
            "total_city_energy_kwh": round(sum(predicted_energies), 2),
            "most_common_transport_mode": most_common_transport,
            "transport_distribution": dict(transport_counter),
            "model_metrics": {
                "energy_prediction": {
                    "algorithm": self.energy_model.algorithm,
                    **self.energy_model.metrics.to_dict(),
                },
                "carbon_prediction": {
                    "algorithm": self.carbon_model.algorithm,
                    **self.carbon_model.metrics.to_dict(),
                },
            },
        }
        return self._dashboard_summary
