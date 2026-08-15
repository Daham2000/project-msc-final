"""Rebuild the citizen dataset so energy and carbon follow the activity columns.

The original export (smart_city_citizen_activity.csv) stored Home_Energy_Consumption_kWh
and Carbon_Footprint_kgCO2 as uniform random values: every transport mode averaged
~55 kgCO2, so walkers and EV drivers scored the same as car drivers and no model
could learn the difference.

This script keeps every observed column (demographics, activity hours, steps,
calories) and recomputes only:

  * Charging_Station_Usage  - forced to 0 for non-EV citizens, which is the only
                              physically meaningful value for a car-charging flag.
  * Home_Energy_Consumption_kWh
  * Carbon_Footprint_kgCO2

using the equations in app/services/domain_model.py, plus a small per-citizen
measurement noise so the targets are not a closed-form function of the inputs.

Usage:
    python scripts/rebuild_dataset.py [source_csv] [output_csv]
"""

import csv
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.domain_model import carbon_footprint_kg, home_energy_kwh  # noqa: E402


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE = PROJECT_ROOT.parent / "smart_city_citizen_activity.csv"
DEFAULT_OUTPUT = PROJECT_ROOT.parent / "smart_city_citizen_activity_v2.csv"

ENERGY_NOISE = 0.06
CARBON_NOISE = 0.05
SEED = 20260815


def rebuild(source: Path, output: Path) -> int:
    with source.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))

    if not rows:
        raise SystemExit(f"No rows found in {source}")

    rng = random.Random(SEED)

    for row in rows:
        mode = str(row.get("Mode_of_Transport", "")).strip()
        if mode != "EV":
            row["Charging_Station_Usage"] = "0"

        energy = home_energy_kwh(row) * (1.0 + rng.uniform(-ENERGY_NOISE, ENERGY_NOISE))
        energy = max(energy, 0.4)
        carbon = carbon_footprint_kg(row, energy_kwh=energy) * (
            1.0 + rng.uniform(-CARBON_NOISE, CARBON_NOISE)
        )

        row["Home_Energy_Consumption_kWh"] = f"{energy:.2f}"
        row["Carbon_Footprint_kgCO2"] = f"{carbon:.2f}"

    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    return len(rows)


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUTPUT

    count = rebuild(source, output)
    print(f"Rebuilt {count} rows -> {output}")


if __name__ == "__main__":
    main()
