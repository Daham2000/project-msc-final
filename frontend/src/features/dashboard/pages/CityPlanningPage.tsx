import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../../../auth/AuthContext";
import { AppIcon } from "../../../components/AppIcon";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { formatCompactNumber, formatNumber } from "../../../utils/format";
import { CitizenForm } from "../CitizenForm";
import { StatCard } from "../components/StatCard";
import {
  addCityCitizen,
  predictCity,
  removeCityCitizen,
  updateCityCitizen,
} from "../dashboardSlice";

const fallbackGenderOptions = ["Female", "Male", "Other"];
const fallbackTransportOptions = ["Walking", "Bike", "Bicycle", "Car", "Public Transport", "EV"];

const BAND_CLASS: Record<string, string> = {
  Excellent: "band-excellent",
  Good: "band-good",
  Moderate: "band-moderate",
  "Needs improvement": "band-poor",
};

const BAND_STYLE: Record<string, { background: string; color: string }> = {
  Excellent: { background: "var(--accent-soft)", color: "var(--accent-strong)" },
  Good: { background: "var(--accent-blue-soft)", color: "var(--accent-blue)" },
  Moderate: { background: "var(--accent-warm-soft)", color: "var(--accent-warm)" },
  "Needs improvement": { background: "var(--danger-soft)", color: "var(--danger)" },
};

export function CityPlanningPage() {
  const { token, user } = useAuth();
  const dispatch = useAppDispatch();
  const { busySection, cityForms, cityResult, metadata } = useAppSelector((state) => state.dashboard);

  if (user?.role !== "admin") {
    return <Navigate replace to="/" />;
  }

  const genderOptions = metadata?.accepted_genders ?? fallbackGenderOptions;
  const transportOptions = metadata?.accepted_transport_modes ?? fallbackTransportOptions;

  const handleCityPredict = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    await dispatch(predictCity({ token, forms: cityForms })).unwrap().catch(() => undefined);
  };

  const maxMonthlyEnergy = cityResult
    ? Math.max(...cityResult.citizen_predictions.map((item) => item.predictions.monthly_average.predicted_energy_consumption_kwh), 1)
    : 1;

  return (
    <div className="dashboard-grid">
      <form className="panel span-full" onSubmit={handleCityPredict}>
        <div className="section-header">
          <div className="panel-title">
            <AppIcon name="city" />
            <div className="panel-title-copy">
              <div className="panel-heading">City planning forecast</div>
              <p>Combine multiple citizen profiles to estimate aggregate energy demand and carbon impact for greener city planning.</p>
            </div>
          </div>
          <button className="secondary-button" type="button" onClick={() => dispatch(addCityCitizen())}>
            <AppIcon name="plus" />
            Add profile
          </button>
        </div>

        <div className="city-form-list">
          {cityForms.map((formValue, index) => (
            <div className="city-citizen-card" key={`city-citizen-${index}`}>
              <div className="section-header">
                <strong>Profile #{index + 1}</strong>
                {cityForms.length > 1 ? (
                  <button className="danger-ghost-button" type="button" onClick={() => dispatch(removeCityCitizen(index))}>
                    <AppIcon name="trash" />
                    Remove
                  </button>
                ) : null}
              </div>
              <CitizenForm
                compact
                showCitizenId
                value={formValue}
                onChange={(value) => dispatch(updateCityCitizen({ index, value }))}
                genderOptions={genderOptions}
                transportOptions={transportOptions}
              />
            </div>
          ))}
        </div>

        <button className="primary-button" disabled={busySection === "city"} type="submit">
          <AppIcon name="city" />
          {busySection === "city" ? "Preparing forecast..." : "Run city forecast"}
        </button>
      </form>

      <div className="panel span-full">
        <div className="panel-title">
          <AppIcon name="overview" />
          <div className="panel-title-copy">
            <div className="panel-heading">Forecast results</div>
            <p>Review per-person daily and monthly impact together with aggregate forecast outcomes.</p>
          </div>
        </div>
        {cityResult ? (
          <>
            <div className="stats-grid">
              <StatCard icon="users" label="Profiles analyzed" value={String(cityResult.citizens_analyzed)} tone="cool" />
              <StatCard icon="energy" label="Average energy per person per day" value={`${formatNumber(cityResult.average_per_person.daily_average.predicted_energy_consumption_kwh)} kWh`} />
              <StatCard icon="carbon" label="Average carbon per person per day" value={`${formatNumber(cityResult.average_per_person.daily_average.predicted_carbon_footprint_kgco2)} kgCO2`} tone="warm" />
              <StatCard icon="energy" label="Average energy per person per month" value={`${formatNumber(cityResult.average_per_person.monthly_average.predicted_energy_consumption_kwh)} kWh`} />
              <StatCard icon="carbon" label="Average carbon per person per month" value={`${formatNumber(cityResult.average_per_person.monthly_average.predicted_carbon_footprint_kgco2)} kgCO2`} tone="warm" />
              <StatCard icon="carbon" label="Total carbon footprint" value={`${formatNumber(cityResult.total_predicted_carbon_kgco2)} kgCO2`} />
              <StatCard icon="energy" label="Total energy demand" value={`${formatNumber(cityResult.total_predicted_energy_kwh)} kWh`} />
            </div>

            {cityResult.citizen_predictions.length ? (
              <div>
                <div className="form-group-title" style={{ marginBottom: "0.6rem" }}>Monthly energy per profile (kWh)</div>
                <div className="bar-chart">
                  {cityResult.citizen_predictions.map((item, index) => {
                    const value = item.predictions.monthly_average.predicted_energy_consumption_kwh;
                    const heightPct = Math.max(6, (value / maxMonthlyEnergy) * 100);
                    return (
                      <div className="bar-col" key={`bar-${item.citizen_id ?? index}`}>
                        <span className="bar-value">{formatCompactNumber(value)}</span>
                        <div className="bar-fill" style={{ height: `${heightPct}%` }} />
                        <span className="bar-label">#{item.citizen_id ?? index + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Energy per day</th>
                    <th>Energy per month</th>
                    <th>Carbon per day</th>
                    <th>Carbon per month</th>
                    <th>Sustainability band</th>
                  </tr>
                </thead>
                <tbody>
                  {cityResult.citizen_predictions.map((item, index) => (
                    <tr key={`${item.citizen_id ?? "unknown"}-${index}`}>
                      <td>{item.citizen_id ?? "N/A"}</td>
                      <td>{formatNumber(item.predictions.daily_average.predicted_energy_consumption_kwh)} kWh</td>
                      <td>{formatNumber(item.predictions.monthly_average.predicted_energy_consumption_kwh)} kWh</td>
                      <td>{formatNumber(item.predictions.daily_average.predicted_carbon_footprint_kgco2)} kgCO2</td>
                      <td>{formatNumber(item.predictions.monthly_average.predicted_carbon_footprint_kgco2)} kgCO2</td>
                      <td>
                        <span
                          className={`band-badge ${BAND_CLASS[item.predictions.sustainability_band] ?? ""}`}
                          style={BAND_STYLE[item.predictions.sustainability_band] ?? BAND_STYLE.Good}
                        >
                          {item.predictions.sustainability_band}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="empty-state">
            Add one or more profiles to generate a planning forecast for operational review.
          </div>
        )}
      </div>
    </div>
  );
}
