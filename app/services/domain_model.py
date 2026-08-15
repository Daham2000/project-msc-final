"""Physical relationships between daily activity, home energy, and carbon output.

The original survey dataset stored energy and carbon values that were unrelated to
the activity columns, so a model trained on it could not learn that walking emits
less than driving. This module holds the domain equations used both to rebuild a
coherent dataset (scripts/rebuild_dataset.py) and to sanity-bound live predictions.

Emission factors are per passenger-kilometre and follow UK DEFRA / IPCC averages.
"""

from typing import Dict


GRID_CARBON_KG_PER_KWH = 0.475

# kg CO2 per passenger-km for directly fuelled modes. EV is derived from grid
# electricity instead, so it stays consistent with home energy accounting.
TRANSPORT_EMISSION_FACTORS: Dict[str, float] = {
    "Walking": 0.0,
    "Bicycle": 0.0,
    "Public Transport": 0.097,
    "Bike": 0.103,
    "Car": 0.192,
}
EV_KWH_PER_KM = 0.17

# Modes that carry no tailpipe or grid load of their own.
ZERO_EMISSION_MODES = {"Walking", "Bicycle"}
GRID_POWERED_MODES = {"EV"}

METRES_PER_STEP = 0.72

BASE_TRAVEL_KM = 2.0
COMMUTE_KM_FIXED = 2.5
COMMUTE_KM_PER_WORK_HOUR = 1.4
SHOPPING_KM_PER_HOUR = 3.0
EVENT_KM_PER_HOUR = 4.0

BASE_HOME_KWH = 1.15
ACTIVE_HOME_HOUR_KWH = 0.155
ENTERTAINMENT_HOUR_KWH = 0.30
SOCIAL_MEDIA_HOUR_KWH = 0.09
AGE_HOME_KWH_PER_YEAR = 0.004

# The dashboard scores mobility and household energy, not diet, so the residual
# constant only covers unmetered household services. A large diet baseline would
# swamp the transport signal the model is meant to expose.
HOUSEHOLD_SERVICES_KG = 1.0
SHOPPING_GOODS_KG_PER_HOUR = 0.45
EVENT_KG_PER_HOUR = 0.30


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return min(max(value, minimum), maximum)


def _number(row: Dict[str, object], field: str) -> float:
    try:
        return float(row[field])
    except (KeyError, TypeError, ValueError):
        return 0.0


def away_hours(row: Dict[str, object]) -> float:
    return _clamp(
        _number(row, "Work_Hours")
        + _number(row, "Shopping_Hours")
        + _number(row, "Public_Events_Hours"),
        0.0,
        24.0,
    )


def active_home_hours(row: Dict[str, object]) -> float:
    sleep_hours = _clamp(_number(row, "Sleep_Hours"), 0.0, 24.0)
    return _clamp(24.0 - sleep_hours - away_hours(row), 0.0, 24.0)


def walked_km(row: Dict[str, object]) -> float:
    return max(_number(row, "Steps_Walked"), 0.0) * METRES_PER_STEP / 1000.0


def daily_travel_km(row: Dict[str, object]) -> float:
    """Total distance the citizen needs to cover, before choosing a mode."""
    work_hours = _number(row, "Work_Hours")
    commute_km = 0.0
    if work_hours > 0:
        commute_km = 2.0 * (COMMUTE_KM_FIXED + COMMUTE_KM_PER_WORK_HOUR * work_hours)

    return (
        BASE_TRAVEL_KM
        + commute_km
        + SHOPPING_KM_PER_HOUR * _number(row, "Shopping_Hours")
        + EVENT_KM_PER_HOUR * _number(row, "Public_Events_Hours")
    )


def motorised_km(row: Dict[str, object]) -> float:
    """Distance actually covered by the chosen vehicle.

    Anything already covered on foot is subtracted, and walkers cover the whole
    trip themselves, so their vehicle distance is zero by construction.
    """
    mode = str(row.get("Mode_of_Transport", "")).strip()
    if mode in ZERO_EMISSION_MODES:
        return 0.0
    return max(0.0, daily_travel_km(row) - walked_km(row))


def ev_charging_kwh(row: Dict[str, object]) -> float:
    mode = str(row.get("Mode_of_Transport", "")).strip()
    if mode not in GRID_POWERED_MODES:
        return 0.0
    return motorised_km(row) * EV_KWH_PER_KM


def home_charged_ev_kwh(row: Dict[str, object]) -> float:
    """EV energy drawn at home, i.e. when a public charging station is not used."""
    if _number(row, "Charging_Station_Usage") >= 0.5:
        return 0.0
    return ev_charging_kwh(row)


def home_energy_kwh(row: Dict[str, object]) -> float:
    """Household electricity for the day, including home EV charging."""
    return (
        BASE_HOME_KWH
        + active_home_hours(row) * ACTIVE_HOME_HOUR_KWH
        + _number(row, "Entertainment_Hours") * ENTERTAINMENT_HOUR_KWH
        + _number(row, "Social_Media_Hours") * SOCIAL_MEDIA_HOUR_KWH
        + _number(row, "Age") * AGE_HOME_KWH_PER_YEAR
        + home_charged_ev_kwh(row)
    )


def transport_carbon_kg(row: Dict[str, object]) -> float:
    """Carbon from travel that is *not* already counted in home electricity."""
    mode = str(row.get("Mode_of_Transport", "")).strip()
    distance = motorised_km(row)

    if mode in GRID_POWERED_MODES:
        # Home-charged kWh is billed to the household, so only public charging is
        # attributed here; otherwise the same electricity is counted twice.
        public_kwh = ev_charging_kwh(row) - home_charged_ev_kwh(row)
        return public_kwh * GRID_CARBON_KG_PER_KWH

    return distance * TRANSPORT_EMISSION_FACTORS.get(mode, TRANSPORT_EMISSION_FACTORS["Car"])


def carbon_footprint_kg(row: Dict[str, object], energy_kwh: float | None = None) -> float:
    """Total daily footprint: household electricity + travel + consumption."""
    household_kwh = home_energy_kwh(row) if energy_kwh is None else max(energy_kwh, 0.0)

    return (
        household_kwh * GRID_CARBON_KG_PER_KWH
        + transport_carbon_kg(row)
        + SHOPPING_GOODS_KG_PER_HOUR * _number(row, "Shopping_Hours")
        + EVENT_KG_PER_HOUR * _number(row, "Public_Events_Hours")
        + HOUSEHOLD_SERVICES_KG
    )
