import type { CitizenPredictionForm } from "../../types/api";

export const defaultCitizenForm = (): CitizenPredictionForm => ({
  Citizen_ID: undefined,
  Age: 30,
  Gender: "Female",
  Mode_of_Transport: "Walking",
  Work_Hours: 8,
  Shopping_Hours: 1,
  Entertainment_Hours: 1,
  Charging_Station_Usage: 0,
  Steps_Walked: 6000,
  Calories_Burned: 450,
  Sleep_Hours: 7,
  Social_Media_Hours: 2,
  Public_Events_Hours: 1,
  Home_Energy_Consumption_kWh: "",
});

export const citizenNumericFields: Array<{
  key: keyof CitizenPredictionForm;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}> = [
  { key: "Citizen_ID", label: "Reference ID", min: 1, step: 1 },
  { key: "Age", label: "Age", min: 1, max: 120, step: 1 },
  { key: "Work_Hours", label: "Hours at work", min: 0, max: 24, step: 1 },
  { key: "Shopping_Hours", label: "Hours shopping", min: 0, max: 24, step: 1 },
  { key: "Entertainment_Hours", label: "Hours for entertainment", min: 0, max: 24, step: 1 },
  { key: "Charging_Station_Usage", label: "Uses public charging", min: 0, max: 1, step: 1 },
  { key: "Steps_Walked", label: "Daily steps", min: 0, step: 1 },
  { key: "Calories_Burned", label: "Calories burned", min: 0, step: 1 },
  { key: "Sleep_Hours", label: "Hours of sleep", min: 0, max: 24, step: 0.1 },
  { key: "Social_Media_Hours", label: "Hours on social media", min: 0, max: 24, step: 0.1 },
  { key: "Public_Events_Hours", label: "Hours at public events", min: 0, max: 24, step: 0.1 },
  {
    key: "Home_Energy_Consumption_kWh",
    label: "Home energy use (optional)",
    min: 0,
    step: 0.01,
  },
];
