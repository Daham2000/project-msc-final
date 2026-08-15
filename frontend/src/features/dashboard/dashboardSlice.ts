import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { api } from "../../api/client";
import type {
  Announcement,
  CitizenPredictionForm,
  CitizenPredictionResponse,
  CityPredictionResponse,
  CreateAnnouncementPayload,
  MetadataResponse,
  RecommendationsResponse,
  SummaryResponse,
  User,
} from "../../types/api";
import { defaultCitizenForm } from "./constants";
import type { CitizenResultView, DashboardBusySection } from "./types";

interface DashboardData {
  metadata: MetadataResponse;
  summary: SummaryResponse;
  recommendations: RecommendationsResponse;
  announcements: Announcement[];
  users: User[];
}

interface DashboardState {
  loading: boolean;
  error: string | null;
  metadata: MetadataResponse | null;
  summary: SummaryResponse | null;
  recommendations: RecommendationsResponse | null;
  announcements: Announcement[];
  users: User[];
  citizenForm: CitizenPredictionForm;
  cityForms: CitizenPredictionForm[];
  citizenResult: CitizenPredictionResponse | null;
  citizenResultView: CitizenResultView;
  cityResult: CityPredictionResponse | null;
  busySection: DashboardBusySection;
  deletingAnnouncementId: string | null;
  announcementForm: CreateAnnouncementPayload;
  announcementStreamSinceId: string | null;
}

const createInitialDashboardState = (): DashboardState => ({
  loading: false,
  error: null,
  metadata: null,
  summary: null,
  recommendations: null,
  announcements: [],
  users: [],
  citizenForm: defaultCitizenForm(),
  cityForms: [
    defaultCitizenForm(),
    { ...defaultCitizenForm(), Citizen_ID: 2, Gender: "Male", Mode_of_Transport: "Public Transport" },
  ],
  citizenResult: null,
  citizenResultView: "summary",
  cityResult: null,
  busySection: null,
  deletingAnnouncementId: null,
  announcementForm: {
    title: "",
    message: "",
    audience_role: "citizen",
    audience_scope: "island_wide",
    cities: [],
  },
  announcementStreamSinceId: null,
});

const initialState = createInitialDashboardState();

const readErrorMessage = (issue: unknown, fallback: string) =>
  issue instanceof Error ? issue.message : fallback;

export const loadDashboardData = createAsyncThunk<
  DashboardData,
  { token: string; isAdmin: boolean },
  { rejectValue: string }
>("dashboard/loadData", async ({ token, isAdmin }, { rejectWithValue }) => {
  try {
    const [metadata, summary, recommendations, announcementResponse] = await Promise.all([
      api.getMetadata(token),
      api.getSummary(token),
      api.getRecommendations(token),
      api.getAnnouncements(token),
    ]);
    const users = isAdmin ? (await api.getUsers(token)).users : [];

    return {
      metadata,
      summary,
      recommendations,
      announcements: announcementResponse.announcements,
      users,
    };
  } catch (issue) {
    return rejectWithValue(readErrorMessage(issue, "Unable to load service information."));
  }
});

export const predictCitizen = createAsyncThunk<
  CitizenPredictionResponse,
  { token: string; form: CitizenPredictionForm },
  { rejectValue: string }
>("dashboard/predictCitizen", async ({ token, form }, { rejectWithValue }) => {
  try {
    return await api.predictCitizen(form, token);
  } catch (issue) {
    return rejectWithValue(readErrorMessage(issue, "We could not prepare your guidance right now."));
  }
});

export const predictCity = createAsyncThunk<
  CityPredictionResponse,
  { token: string; forms: CitizenPredictionForm[] },
  { rejectValue: string }
>("dashboard/predictCity", async ({ token, forms }, { rejectWithValue }) => {
  try {
    return await api.predictCity({ citizens: forms }, token);
  } catch (issue) {
    return rejectWithValue(readErrorMessage(issue, "We could not complete the city planning forecast."));
  }
});

export const createAnnouncement = createAsyncThunk<
  Announcement[],
  { token: string; payload: CreateAnnouncementPayload },
  { rejectValue: string }
>("dashboard/createAnnouncement", async ({ token, payload }, { rejectWithValue }) => {
  try {
    await api.createAnnouncement(payload, token);
    return (await api.getAnnouncements(token)).announcements;
  } catch (issue) {
    return rejectWithValue(readErrorMessage(issue, "We could not publish the notice."));
  }
});

export const deleteAnnouncement = createAsyncThunk<
  string,
  { token: string; announcementId: string },
  { rejectValue: string }
>("dashboard/deleteAnnouncement", async ({ token, announcementId }, { rejectWithValue }) => {
  try {
    await api.deleteAnnouncement(announcementId, token);
    return announcementId;
  } catch (issue) {
    return rejectWithValue(readErrorMessage(issue, "We could not delete the notice."));
  }
});

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    resetDashboard: () => createInitialDashboardState(),
    clearDashboardError(state) {
      state.error = null;
    },
    setCitizenForm(state, action: PayloadAction<CitizenPredictionForm>) {
      state.citizenForm = action.payload;
    },
    setCitizenResultView(state, action: PayloadAction<CitizenResultView>) {
      state.citizenResultView = action.payload;
    },
    addCityCitizen(state) {
      state.cityForms.push({ ...defaultCitizenForm(), Citizen_ID: state.cityForms.length + 1 });
    },
    updateCityCitizen(
      state,
      action: PayloadAction<{ index: number; value: CitizenPredictionForm }>
    ) {
      const { index, value } = action.payload;
      state.cityForms[index] = value;
    },
    removeCityCitizen(state, action: PayloadAction<number>) {
      state.cityForms = state.cityForms.filter((_, index) => index !== action.payload);
    },
    setAnnouncementForm(state, action: PayloadAction<CreateAnnouncementPayload>) {
      state.announcementForm = action.payload;
    },
    receiveAnnouncement(state, action: PayloadAction<Announcement>) {
      if (!state.announcements.some((item) => item.id === action.payload.id)) {
        state.announcements.unshift(action.payload);
      }
      state.announcementStreamSinceId = action.payload.id;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.metadata = action.payload.metadata;
        state.summary = action.payload.summary;
        state.recommendations = action.payload.recommendations;
        state.announcements = action.payload.announcements;
        state.users = action.payload.users;
        state.announcementStreamSinceId =
          state.announcementStreamSinceId ?? action.payload.announcements[0]?.id ?? "";
      })
      .addCase(loadDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Unable to load service information.";
      })
      .addCase(predictCitizen.pending, (state) => {
        state.busySection = "citizen";
        state.error = null;
      })
      .addCase(predictCitizen.fulfilled, (state, action) => {
        state.busySection = null;
        state.citizenResult = action.payload;
        state.citizenResultView = "summary";
      })
      .addCase(predictCitizen.rejected, (state, action) => {
        state.busySection = null;
        state.error = action.payload ?? "We could not prepare your guidance right now.";
      })
      .addCase(predictCity.pending, (state) => {
        state.busySection = "city";
        state.error = null;
      })
      .addCase(predictCity.fulfilled, (state, action) => {
        state.busySection = null;
        state.cityResult = action.payload;
      })
      .addCase(predictCity.rejected, (state, action) => {
        state.busySection = null;
        state.error = action.payload ?? "We could not complete the city planning forecast.";
      })
      .addCase(createAnnouncement.pending, (state) => {
        state.busySection = "broadcast";
        state.error = null;
      })
      .addCase(createAnnouncement.fulfilled, (state, action) => {
        state.busySection = null;
        state.announcementForm = createInitialDashboardState().announcementForm;
        state.announcements = action.payload;
        state.announcementStreamSinceId = state.announcementStreamSinceId ?? action.payload[0]?.id ?? "";
      })
      .addCase(createAnnouncement.rejected, (state, action) => {
        state.busySection = null;
        state.error = action.payload ?? "We could not publish the notice.";
      })
      .addCase(deleteAnnouncement.pending, (state, action) => {
        state.deletingAnnouncementId = action.meta.arg.announcementId;
        state.error = null;
      })
      .addCase(deleteAnnouncement.fulfilled, (state, action) => {
        state.deletingAnnouncementId = null;
        state.announcements = state.announcements.filter((item) => item.id !== action.payload);
      })
      .addCase(deleteAnnouncement.rejected, (state, action) => {
        state.deletingAnnouncementId = null;
        state.error = action.payload ?? "We could not delete the notice.";
      });
  },
});

export const {
  addCityCitizen,
  clearDashboardError,
  receiveAnnouncement,
  removeCityCitizen,
  resetDashboard,
  setAnnouncementForm,
  setCitizenForm,
  setCitizenResultView,
  updateCityCitizen,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
