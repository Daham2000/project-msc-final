"""Unit tests for the emission equations (app/ml/domain_model.py).

This module is what makes a prediction physically defensible: the learned model
supplies behavioural variation, but these equations guarantee that a walker can
never be charged for vehicle emissions. The dataset was rebuilt from them, and
live predictions are clamped to them, so a silent change here would corrupt both.

Pure functions over a plain dict - no dataset, no database, no Flask app.
"""

import pytest

from app.ml.domain_model import (
    GRID_CARBON_KG_PER_KWH,
    TRANSPORT_EMISSION_FACTORS,
    active_home_hours,
    away_hours,
    carbon_footprint_kg,
    daily_travel_km,
    ev_charging_kwh,
    home_charged_ev_kwh,
    home_energy_kwh,
    motorised_km,
    transport_carbon_kg,
    walked_km,
)


def citizen(**overrides) -> dict:
    """A typical working citizen; individual columns are overridden per test."""
    row = {
        "Age": 30.0,
        "Gender": "Male",
        "Mode_of_Transport": "Car",
        "Work_Hours": 8.0,
        "Shopping_Hours": 1.0,
        "Entertainment_Hours": 2.0,
        "Charging_Station_Usage": 0.0,
        "Steps_Walked": 5000.0,
        "Calories_Burned": 2000.0,
        "Sleep_Hours": 7.0,
        "Social_Media_Hours": 2.0,
        "Public_Events_Hours": 0.0,
    }
    row.update(overrides)
    return row


class TestTimeBudget:
    def test_away_hours_sum_the_out_of_house_activities(self):
        row = citizen(Work_Hours=8.0, Shopping_Hours=1.0, Public_Events_Hours=2.0)

        assert away_hours(row) == pytest.approx(11.0)

    def test_active_home_hours_are_what_is_left_after_sleep_and_travel(self):
        row = citizen(Sleep_Hours=7.0, Work_Hours=8.0, Shopping_Hours=1.0, Public_Events_Hours=0.0)

        assert active_home_hours(row) == pytest.approx(8.0)

    def test_an_over_booked_day_never_produces_negative_home_hours(self):
        """Survey rows can exceed 24 h; the clamp keeps energy non-negative."""
        row = citizen(Sleep_Hours=10.0, Work_Hours=12.0, Shopping_Hours=6.0)

        assert active_home_hours(row) == 0.0

    def test_missing_columns_are_treated_as_zero(self):
        assert away_hours({}) == 0.0


class TestDistance:
    def test_steps_convert_to_kilometres(self):
        assert walked_km(citizen(Steps_Walked=5000.0)) == pytest.approx(3.6)

    def test_travel_distance_grows_with_the_working_day(self):
        short_day = daily_travel_km(citizen(Work_Hours=2.0))
        long_day = daily_travel_km(citizen(Work_Hours=10.0))

        assert long_day > short_day

    def test_no_commute_is_added_when_the_citizen_does_not_work(self):
        row = citizen(Work_Hours=0.0, Shopping_Hours=0.0, Public_Events_Hours=0.0)

        assert daily_travel_km(row) == pytest.approx(2.0)

    def test_walkers_cover_the_whole_trip_themselves(self):
        """Zero-emission modes have no vehicle distance by construction."""
        assert motorised_km(citizen(Mode_of_Transport="Walking")) == 0.0
        assert motorised_km(citizen(Mode_of_Transport="Bicycle")) == 0.0

    def test_distance_already_walked_is_deducted_from_the_vehicle_trip(self):
        few_steps = motorised_km(citizen(Steps_Walked=0.0))
        many_steps = motorised_km(citizen(Steps_Walked=5000.0))

        assert many_steps == pytest.approx(few_steps - 3.6)

    def test_vehicle_distance_never_goes_negative(self):
        """A citizen who walks further than they travel still drives 0 km."""
        row = citizen(Steps_Walked=200000.0, Work_Hours=0.0, Shopping_Hours=0.0)

        assert motorised_km(row) == 0.0


class TestHomeEnergy:
    def test_energy_is_the_documented_sum_of_its_parts(self):
        # 1.15 base + 8 h x 0.155 + 2 h x 0.30 + 2 h x 0.09 + 30 yr x 0.004
        row = citizen(Mode_of_Transport="Car")

        assert home_energy_kwh(row) == pytest.approx(3.29)

    def test_more_screen_time_raises_household_energy(self):
        low = home_energy_kwh(citizen(Entertainment_Hours=0.0))
        high = home_energy_kwh(citizen(Entertainment_Hours=6.0))

        assert high > low

    def test_a_non_ev_never_adds_charging_load(self):
        assert ev_charging_kwh(citizen(Mode_of_Transport="Car")) == 0.0
        assert home_charged_ev_kwh(citizen(Mode_of_Transport="Walking")) == 0.0

    def test_home_charging_appears_on_the_household_bill(self):
        row = citizen(Mode_of_Transport="EV", Charging_Station_Usage=0.0)

        assert home_charged_ev_kwh(row) == pytest.approx(ev_charging_kwh(row))
        assert home_energy_kwh(row) > home_energy_kwh(citizen(Mode_of_Transport="Car"))

    def test_public_charging_stays_off_the_household_bill(self):
        row = citizen(Mode_of_Transport="EV", Charging_Station_Usage=1.0)

        assert home_charged_ev_kwh(row) == 0.0
        assert home_energy_kwh(row) == pytest.approx(home_energy_kwh(citizen()))


class TestTransportCarbon:
    def test_zero_emission_modes_emit_nothing(self):
        assert transport_carbon_kg(citizen(Mode_of_Transport="Walking")) == 0.0
        assert transport_carbon_kg(citizen(Mode_of_Transport="Bicycle")) == 0.0

    def test_car_emissions_follow_the_published_factor(self):
        row = citizen(Mode_of_Transport="Car")
        expected = motorised_km(row) * TRANSPORT_EMISSION_FACTORS["Car"]

        assert transport_carbon_kg(row) == pytest.approx(expected)

    def test_modes_rank_in_the_physically_correct_order(self):
        """The defect this module was written to fix: mode must matter."""
        walking = transport_carbon_kg(citizen(Mode_of_Transport="Walking"))
        transit = transport_carbon_kg(citizen(Mode_of_Transport="Public Transport"))
        motorbike = transport_carbon_kg(citizen(Mode_of_Transport="Bike"))
        car = transport_carbon_kg(citizen(Mode_of_Transport="Car"))

        assert walking < transit < motorbike < car

    def test_an_unknown_mode_falls_back_to_the_car_factor(self):
        """A conservative default: never under-report an unrecognised mode."""
        unknown = transport_carbon_kg(citizen(Mode_of_Transport="Helicopter"))
        car = transport_carbon_kg(citizen(Mode_of_Transport="Car"))

        assert unknown == pytest.approx(car)


class TestCarbonFootprint:
    def test_footprint_combines_electricity_travel_and_consumption(self):
        row = citizen(Mode_of_Transport="Car")
        expected = (
            home_energy_kwh(row) * GRID_CARBON_KG_PER_KWH
            + transport_carbon_kg(row)
            + 0.45 * row["Shopping_Hours"]
            + 0.30 * row["Public_Events_Hours"]
            + 1.0
        )

        assert carbon_footprint_kg(row) == pytest.approx(expected)

    def test_a_walker_emits_less_than_a_driver(self):
        walker = carbon_footprint_kg(citizen(Mode_of_Transport="Walking"))
        driver = carbon_footprint_kg(citizen(Mode_of_Transport="Car"))

        assert walker < driver

    def test_ev_charging_is_never_counted_twice(self):
        """The invariant that keeps EV accounting honest.

        Charging at home bills the kWh to the household; charging publicly bills
        it to transport. Either way the citizen's total footprint is identical.
        """
        at_home = citizen(Mode_of_Transport="EV", Charging_Station_Usage=0.0)
        in_public = citizen(Mode_of_Transport="EV", Charging_Station_Usage=1.0)

        assert carbon_footprint_kg(at_home) == pytest.approx(carbon_footprint_kg(in_public))

    def test_an_energy_override_replaces_the_estimated_household_figure(self):
        row = citizen(Mode_of_Transport="Car")

        low = carbon_footprint_kg(row, energy_kwh=1.0)
        high = carbon_footprint_kg(row, energy_kwh=20.0)

        assert high - low == pytest.approx(19.0 * GRID_CARBON_KG_PER_KWH)

    def test_a_negative_energy_override_is_clamped_to_zero(self):
        row = citizen(Mode_of_Transport="Car")

        assert carbon_footprint_kg(row, energy_kwh=-50.0) == pytest.approx(
            carbon_footprint_kg(row, energy_kwh=0.0)
        )

    def test_footprint_is_always_positive(self):
        """Even a citizen who does nothing carries the household services baseline."""
        idle = {"Mode_of_Transport": "Walking"}

        assert carbon_footprint_kg(idle) > 0.0
