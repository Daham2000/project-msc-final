import type {
  Announcement,
  AnnouncementListResponse,
  AuthResponse,
  CitizenPredictionForm,
  CitizenPredictionResponse,
  CityPredictionResponse,
  CreateAnnouncementPayload,
  HealthResponse,
  LoginPayload,
  MetadataResponse,
  RecommendationsResponse,
  RegisterPayload,
  SummaryResponse,
  User,
  UserListResponse,
} from "../types/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:5000/api/v1";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(payload?.error ?? "Request failed.", response.status);
  }

  return payload as T;
}

export const api = {
  getHealth: () => request<HealthResponse>("/health"),
  register: (payload: RegisterPayload) =>
    request<{ message: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload: LoginPayload) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getCurrentUser: (token: string) =>
    request<{ user: User }>("/auth/me", { method: "GET" }, token),
  getMetadata: (token: string) => request<MetadataResponse>("/metadata", {}, token),
  getSummary: (token: string) => request<SummaryResponse>("/dashboard/summary", {}, token),
  getRecommendations: (token: string) =>
    request<RecommendationsResponse>("/insights/recommendations", {}, token),
  predictCitizen: (payload: CitizenPredictionForm, token: string) =>
    request<CitizenPredictionResponse>(
      "/predict/citizen",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      token
    ),
  predictCity: (payload: { citizens: CitizenPredictionForm[] }, token: string) =>
    request<CityPredictionResponse>(
      "/predict/city",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      token
    ),
  getAnnouncements: (token: string) =>
    request<AnnouncementListResponse>("/announcements", {}, token),
  getUsers: (token: string) => request<UserListResponse>("/admin/users", {}, token),
  createAnnouncement: (payload: CreateAnnouncementPayload, token: string) =>
    request<{ message: string; announcement: Announcement }>(
      "/admin/announcements",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      token
    ),
};

export { ApiError, API_BASE_URL };
