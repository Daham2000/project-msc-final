export type UserRole = "citizen" | "admin";

export interface UserProfile {
  age?: number;
  gender?: string;
  city?: string;
  phone?: string;
  address?: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  profile: UserProfile;
  created_at: string | null;
  last_login_at: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: "Bearer";
  user: User;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  age?: number;
  /** Required by the API: notices are targeted by city. */
  city: string;
  gender?: string;
  phone?: string;
  address?: string;
}

export interface CitiesResponse {
  country: string;
  count: number;
  cities: string[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface HealthResponse {
  status: string;
  dataset_path: string;
  records_loaded: number;
  models_trained: boolean;
}

export interface ModelMetric {
  algorithm?: string;
  mae: number;
  rmse: number;
  r2: number;
}

export interface MetadataResponse {
  dataset_path: string;
  records_loaded: number;
  accepted_genders: string[];
  accepted_transport_modes: string[];
  required_prediction_fields: Record<string, string>;
  model_metrics: {
    energy_prediction: ModelMetric;
    carbon_prediction: ModelMetric;
  };
}

export interface SummaryResponse {
  citizens_profiled: number;
  average_predicted_carbon_kgco2: number;
  average_predicted_energy_kwh: number;
  total_city_carbon_kgco2: number;
  total_city_energy_kwh: number;
  most_common_transport_mode: string | null;
  transport_distribution: Record<string, number>;
  model_metrics: {
    energy_prediction: ModelMetric;
    carbon_prediction: ModelMetric;
  };
}

export interface RecommendationsResponse {
  summary: SummaryResponse;
  city_recommendations: string[];
}

export interface CitizenPredictionForm {
  Citizen_ID?: number;
  Age: number;
  Gender: string;
  Mode_of_Transport: string;
  Work_Hours: number;
  Shopping_Hours: number;
  Entertainment_Hours: number;
  Charging_Station_Usage: number;
  Steps_Walked: number;
  Calories_Burned: number;
  Sleep_Hours: number;
  Social_Media_Hours: number;
  Public_Events_Hours: number;
  Home_Energy_Consumption_kWh?: number | "";
}

export interface CitizenPredictionResponse {
  citizen_id: number | null;
  inputs: Record<string, string | number>;
  predictions: {
    predicted_energy_consumption_kwh: number;
    predicted_carbon_footprint_kgco2: number;
    sustainability_band: string;
    daily_average: PredictionPeriodMetrics;
    monthly_average: PredictionPeriodMetrics;
  };
  recommendations: {
    eco_friendly_alternatives: string[];
    energy_saving_tips: string[];
    health_suggestions: string[];
  };
}

export interface PredictionPeriodMetrics {
  predicted_energy_consumption_kwh: number;
  predicted_carbon_footprint_kgco2: number;
}

export interface CityPredictionResponse {
  citizens_analyzed: number;
  average_predicted_carbon_kgco2: number;
  average_predicted_energy_kwh: number;
  average_per_person: {
    daily_average: PredictionPeriodMetrics;
    monthly_average: PredictionPeriodMetrics;
  };
  total_predicted_carbon_kgco2: number;
  total_predicted_energy_kwh: number;
  citizen_predictions: CitizenPredictionResponse[];
}

/** "island_wide" reaches every city; "cities" reaches only the listed ones. */
export type AudienceScope = "island_wide" | "cities";

export interface Announcement {
  id: string;
  title: string;
  message: string;
  audience_role: "citizen" | "all";
  audience_scope: AudienceScope;
  cities: string[];
  created_at: string;
  expires_at: string | null;
  created_by: {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
  };
}

export interface AnnouncementListResponse {
  count: number;
  announcements: Announcement[];
}

export interface CreateAnnouncementPayload {
  title: string;
  message: string;
  audience_role: "citizen" | "all";
  audience_scope: AudienceScope;
  cities: string[];
}

export interface UserListResponse {
  count: number;
  users: User[];
}
