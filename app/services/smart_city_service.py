from collections import Counter
from typing import Dict, List

from .data_utils import (
    CARBON_TARGET,
    CATEGORICAL_FIELDS,
    ENERGY_TARGET,
    IDENTIFIER_FIELD,
    NUMERIC_FIELDS,
    average,
    collect_categories,
    load_dataset,
)
from .ml import TrainedRegressionModel
from .recommendations import citizen_recommendations, sustainability_band


ENERGY_FEATURES = list(NUMERIC_FIELDS)
CARBON_FEATURES = list(NUMERIC_FIELDS) + [ENERGY_TARGET]


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

        predicted_energy = self.energy_model.predict(citizen)
        citizen[ENERGY_TARGET] = (
            citizen[ENERGY_TARGET] if payload.get(ENERGY_TARGET) not in (None, "") else predicted_energy
        )
        predicted_carbon = self.carbon_model.predict(citizen)

        recommendations = citizen_recommendations(citizen)

        return {
            "citizen_id": int(citizen[IDENTIFIER_FIELD]) if citizen[IDENTIFIER_FIELD] else None,
            "inputs": {
                key: citizen[key]
                for key in NUMERIC_FIELDS + CATEGORICAL_FIELDS + [ENERGY_TARGET]
            },
            "predictions": {
                "predicted_energy_consumption_kwh": round(max(predicted_energy, 0.0), 2),
                "predicted_carbon_footprint_kgco2": round(max(predicted_carbon, 0.0), 2),
                "sustainability_band": sustainability_band(predicted_carbon),
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
            predicted_energy = self.energy_model.predict(working)
            working[ENERGY_TARGET] = predicted_energy
            predicted_carbon = self.carbon_model.predict(working)
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
