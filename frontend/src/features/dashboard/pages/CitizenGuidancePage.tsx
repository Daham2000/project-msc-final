import type { FormEvent } from "react";

import { useAuth } from "../../../auth/AuthContext";
import { AppIcon } from "../../../components/AppIcon";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { formatNumber } from "../../../utils/format";
import { CitizenForm } from "../CitizenForm";
import { RecommendationBlock } from "../components/RecommendationBlock";
import { StatCard } from "../components/StatCard";
import { predictCitizen, setCitizenForm } from "../dashboardSlice";

const fallbackGenderOptions = ["Female", "Male", "Other"];
const fallbackTransportOptions = ["Walking", "Bike", "Bicycle", "Car", "Public Transport", "EV"];

export function CitizenGuidancePage() {
  const { token } = useAuth();
  const dispatch = useAppDispatch();
  const {
    busySection,
    citizenForm,
    citizenResult,
    citizenResultView,
    metadata,
  } = useAppSelector((state) => state.dashboard);

  const genderOptions = metadata?.accepted_genders ?? fallbackGenderOptions;
  const transportOptions = metadata?.accepted_transport_modes ?? fallbackTransportOptions;
  const showRecommendationsOnly = citizenResultView === "recommendations";

  const handleCitizenPredict = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    await dispatch(predictCitizen({ token, form: citizenForm })).unwrap().catch(() => undefined);
  };

  return (
    <div className="dashboard-grid">
      <form className="panel" onSubmit={handleCitizenPredict}>
        <div className="panel-title">
          <AppIcon name="guidance" />
          <div className="panel-title-copy">
            <div className="panel-heading">Personal sustainability check</div>
            <p>Enter a household profile to receive guidance that supports lower-carbon, energy-aware living.</p>
          </div>
        </div>
        <CitizenForm
          value={citizenForm}
          onChange={(value) => dispatch(setCitizenForm(value))}
          genderOptions={genderOptions}
          transportOptions={transportOptions}
        />
        <button className="primary-button" disabled={busySection === "citizen"} type="submit">
          <AppIcon name="spark" />
          {busySection === "citizen" ? "Preparing guidance..." : "Get guidance"}
        </button>
      </form>

      <div className="panel result-panel">
        <div className="panel-title">
          <AppIcon name="leaf" />
          <div className="panel-title-copy">
            <div className="panel-heading">
              {showRecommendationsOnly ? "Personal recommendations" : "Guidance summary"}
            </div>
            <p>
              {showRecommendationsOnly
                ? "Review only the practical recommendations from your latest sustainability check."
                : "Review estimated daily and monthly impact alongside practical sustainability recommendations."}
            </p>
          </div>
        </div>
        {citizenResult ? (
          <>
            {!showRecommendationsOnly ? (
              <div className="stats-grid single-column">
                <StatCard icon="energy" label="Personal energy estimate" value={`${formatNumber(citizenResult.predictions.predicted_energy_consumption_kwh)} kWh`} />
                <StatCard icon="carbon" label="Estimated carbon footprint" value={`${formatNumber(citizenResult.predictions.predicted_carbon_footprint_kgco2)} kgCO2`} tone="warm" />
                <StatCard icon="leaf" label="Sustainability band" value={citizenResult.predictions.sustainability_band} tone="cool" />
                <StatCard icon="energy" label="Average energy per day" value={`${formatNumber(citizenResult.predictions.daily_average.predicted_energy_consumption_kwh)} kWh`} />
                <StatCard icon="carbon" label="Average carbon per day" value={`${formatNumber(citizenResult.predictions.daily_average.predicted_carbon_footprint_kgco2)} kgCO2`} tone="warm" />
                <StatCard icon="energy" label="Projected energy per 30-day month" value={`${formatNumber(citizenResult.predictions.monthly_average.predicted_energy_consumption_kwh)} kWh`} />
                <StatCard icon="carbon" label="Projected carbon per 30-day month" value={`${formatNumber(citizenResult.predictions.monthly_average.predicted_carbon_footprint_kgco2)} kgCO2`} tone="warm" />
              </div>
            ) : null}

            <RecommendationBlock icon="transport" title="Lower-impact travel and lifestyle options" items={citizenResult.recommendations.eco_friendly_alternatives} />
            <RecommendationBlock icon="energy" title="Household energy saving tips" items={citizenResult.recommendations.energy_saving_tips} />
            <RecommendationBlock icon="spark" title="Wellbeing suggestions" items={citizenResult.recommendations.health_suggestions} />
          </>
        ) : (
          <div className="empty-state">
            {showRecommendationsOnly
              ? "Run the personal sustainability check first; recommendations will appear here after the prediction is ready."
              : "Complete the form to receive tailored guidance, household energy estimates, and practical next steps."}
          </div>
        )}
      </div>
    </div>
  );
}
