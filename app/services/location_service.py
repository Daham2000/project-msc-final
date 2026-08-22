"""Canonical list of serviceable cities.

The list lives on the backend so registration, notice targeting, and stored user
profiles all validate against exactly the same names. The frontend reads it from
GET /api/v1/cities rather than bundling its own copy.
"""

import json
from pathlib import Path
from typing import Dict, Iterable, List


class LocationService:
    def __init__(self, dataset_path: str):
        path = Path(dataset_path)
        if not path.exists():
            raise FileNotFoundError(f"City list not found at '{dataset_path}'.")

        with path.open(encoding="utf-8") as handle:
            payload = json.load(handle)

        self.country: str = str(payload.get("country", "")).strip()
        self.cities: List[str] = sorted({str(city).strip() for city in payload.get("cities", []) if str(city).strip()})

        if not self.cities:
            raise ValueError(f"City list at '{dataset_path}' is empty.")

        # Case- and spacing-insensitive lookup so a client that sends "colombo"
        # still resolves to the canonical "Colombo" that gets stored.
        self._lookup: Dict[str, str] = {self._key(city): city for city in self.cities}

    @staticmethod
    def _key(value: str) -> str:
        return " ".join(str(value).split()).casefold()

    def is_known(self, value: str) -> bool:
        return self._key(value) in self._lookup

    def normalize(self, value: str) -> str:
        """Return the canonical spelling of a city, or raise if it is not serviced."""
        canonical = self._lookup.get(self._key(value))
        if canonical is None:
            raise ValueError(f"'{value}' is not a serviced city.")
        return canonical

    def normalize_many(self, values: Iterable[str]) -> List[str]:
        """Canonicalise a list of cities, dropping duplicates and keeping list order."""
        normalized: List[str] = []
        for value in values:
            canonical = self.normalize(value)
            if canonical not in normalized:
                normalized.append(canonical)
        return normalized

    def to_dict(self) -> Dict[str, object]:
        return {"country": self.country, "count": len(self.cities), "cities": self.cities}
