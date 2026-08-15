import type { CitizenPredictionForm } from "../../types/api";
import { citizenNumericFields } from "./constants";

interface CitizenFormProps {
  value: CitizenPredictionForm;
  onChange: (nextValue: CitizenPredictionForm) => void;
  genderOptions: string[];
  transportOptions: string[];
  title?: string;
  compact?: boolean;
  showCitizenId?: boolean;
}

const routineKeys = ["Work_Hours", "Sleep_Hours", "Shopping_Hours", "Entertainment_Hours"];
const activityKeys = ["Steps_Walked", "Calories_Burned", "Social_Media_Hours", "Public_Events_Hours"];

export function CitizenForm({
  value,
  onChange,
  genderOptions,
  transportOptions,
  title,
  compact = false,
  showCitizenId = false,
}: CitizenFormProps) {
  const updateField = (key: keyof CitizenPredictionForm, nextValue: string) => {
    if (key === "Gender" || key === "Mode_of_Transport") {
      onChange({ ...value, [key]: nextValue });
      return;
    }

    if (key === "Home_Energy_Consumption_kWh" && nextValue === "") {
      onChange({ ...value, [key]: "" });
      return;
    }

    onChange({ ...value, [key]: Number(nextValue) });
  };

  const fieldByKey = (key: string) => citizenNumericFields.find((field) => field.key === key);
  const renderNumberField = (key: string) => {
    const field = fieldByKey(key);
    if (!field) {
      return null;
    }
    return (
      <label className="field" key={field.key}>
        <span>{field.label}</span>
        <input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={value[field.key] ?? ""}
          onChange={(event) => updateField(field.key, event.target.value)}
        />
      </label>
    );
  };

  const chargingOn = Number(value.Charging_Station_Usage) === 1;

  return (
    <div className={`form-shell ${compact ? "compact" : ""}`}>
      {title ? <div className="panel-heading">{title}</div> : null}

      <div className="form-group">
        {!compact ? <div className="form-group-title">Basics</div> : null}
        <div className="form-grid">
          {showCitizenId ? renderNumberField("Citizen_ID") : null}
          <label className="field">
            <span>Gender</span>
            <select value={value.Gender} onChange={(event) => updateField("Gender", event.target.value)}>
              {genderOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Transport Mode</span>
            <select
              value={value.Mode_of_Transport}
              onChange={(event) => updateField("Mode_of_Transport", event.target.value)}
            >
              {transportOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {renderNumberField("Age")}

          <div className="field">
            <span>Uses public charging</span>
            <div className="toggle-row">
              <button
                type="button"
                className={`toggle-switch ${chargingOn ? "on" : ""}`}
                role="switch"
                aria-checked={chargingOn}
                onClick={() => updateField("Charging_Station_Usage", chargingOn ? "0" : "1")}
              >
                <span className="toggle-knob" />
              </button>
              <span style={{ color: "var(--text-soft)", fontSize: "0.85rem" }}>{chargingOn ? "Yes" : "No"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="form-group">
        {!compact ? <div className="form-group-title">Daily routine (hours)</div> : null}
        <div className="form-grid">{routineKeys.map((key) => renderNumberField(key))}</div>
      </div>

      <div className="form-group">
        {!compact ? <div className="form-group-title">Activity &amp; habits</div> : null}
        <div className="form-grid">
          {activityKeys.map((key) => renderNumberField(key))}
          {renderNumberField("Home_Energy_Consumption_kWh")}
        </div>
      </div>
    </div>
  );
}
