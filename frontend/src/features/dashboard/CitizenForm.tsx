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

  const fields = citizenNumericFields.filter((field) => showCitizenId || field.key !== "Citizen_ID");

  return (
    <div className={`form-shell ${compact ? "compact" : ""}`}>
      {title ? <div className="panel-heading">{title}</div> : null}
      <div className="form-grid">
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

        <label className="field">
          <span>Uses public charging</span>
          <select
            value={String(value.Charging_Station_Usage)}
            onChange={(event) => updateField("Charging_Station_Usage", event.target.value)}
          >
            <option value="0">No</option>
            <option value="1">Yes</option>
          </select>
        </label>

        {fields
          .filter((field) => field.key !== "Charging_Station_Usage")
          .map((field) => (
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
        ))}
      </div>
    </div>
  );
}
