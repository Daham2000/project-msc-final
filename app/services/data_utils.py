import csv
from collections import Counter
from pathlib import Path
from typing import Dict, List


NUMERIC_FIELDS = [
    "Age",
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

ENERGY_TARGET = "Home_Energy_Consumption_kWh"
CARBON_TARGET = "Carbon_Footprint_kgCO2"
CATEGORICAL_FIELDS = ["Gender", "Mode_of_Transport"]
IDENTIFIER_FIELD = "Citizen_ID"


def load_dataset(dataset_path: str) -> List[Dict[str, object]]:
    path = Path(dataset_path)
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found at '{dataset_path}'.")

    records: List[Dict[str, object]] = []
    with path.open(newline="", encoding="utf-8-sig") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            parsed = {}
            for key, value in row.items():
                if key in CATEGORICAL_FIELDS:
                    parsed[key] = (value or "").strip()
                else:
                    parsed[key] = float(value) if value not in (None, "") else 0.0
            records.append(parsed)
    return records


def collect_categories(records: List[Dict[str, object]]) -> Dict[str, List[str]]:
    categories: Dict[str, Counter] = {field: Counter() for field in CATEGORICAL_FIELDS}
    for record in records:
        for field in CATEGORICAL_FIELDS:
            categories[field][str(record[field])] += 1
    return {field: sorted(counter.keys()) for field, counter in categories.items()}


def average(values: List[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def round_dict(values: Dict[str, float], digits: int = 2) -> Dict[str, float]:
    return {key: round(value, digits) for key, value in values.items()}
