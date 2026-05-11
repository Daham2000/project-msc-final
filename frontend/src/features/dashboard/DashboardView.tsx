import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { AppIcon, type AppIconName } from "../../components/AppIcon";
import { useAnnouncementNotifications } from "../../hooks/useAnnouncementNotifications";
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
import {
  formatCompactNumber,
  formatDate,
  formatNumber,
  formatShortDate,
} from "../../utils/format";
import { CitizenForm } from "./CitizenForm";
import { defaultCitizenForm } from "./constants";

type AppTab =
  | "overview"
  | "profile"
  | "citizen"
  | "city"
  | "announcements"
  | "metadata"
  | "users"
  | "broadcast";

type TabDefinition = {
  id: AppTab;
  label: string;
  icon: AppIconName;
};

type CitizenResultView = "summary" | "recommendations";

const citizenTabs: TabDefinition[] = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "profile", label: "Profile", icon: "profile" },
  { id: "citizen", label: "Guidance", icon: "guidance" },
  { id: "announcements", label: "Notices", icon: "notice" },
];

const adminTabs: TabDefinition[] = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "profile", label: "Profile", icon: "profile" },
  { id: "citizen", label: "Assessment", icon: "guidance" },
  { id: "city", label: "City Planning", icon: "city" },
  { id: "announcements", label: "Notices", icon: "notice" },
  { id: "metadata", label: "Service Data", icon: "data" },
  { id: "users", label: "Users", icon: "users" },
  { id: "broadcast", label: "Publish", icon: "broadcast" },
];

export function DashboardView() {
  const { token, user, logout } = useAuth();
  const [tab, setTab] = useState<AppTab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [citizenForm, setCitizenForm] = useState<CitizenPredictionForm>(defaultCitizenForm());
  const [cityForms, setCityForms] = useState<CitizenPredictionForm[]>([
    defaultCitizenForm(),
    { ...defaultCitizenForm(), Citizen_ID: 2, Gender: "Male", Mode_of_Transport: "Public Transport" },
  ]);
  const [citizenResult, setCitizenResult] = useState<CitizenPredictionResponse | null>(null);
  const [citizenResultView, setCitizenResultView] = useState<CitizenResultView>("summary");
  const [cityResult, setCityResult] = useState<CityPredictionResponse | null>(null);
  const [busySection, setBusySection] = useState<string | null>(null);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<string | null>(null);
  const [announcementForm, setAnnouncementForm] = useState<CreateAnnouncementPayload>({
    title: "",
    message: "",
    audience_role: "citizen",
  });
  const [announcementStreamSinceId, setAnnouncementStreamSinceId] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";
  const tabs = useMemo(() => (isAdmin ? adminTabs : citizenTabs), [isAdmin]);
  const currentTab = tabs.find((entry) => entry.id === tab) ?? tabs[0];
  const showCitizenRecommendationsOnly = citizenResultView === "recommendations";

  useEffect(() => {
    if (!tabs.some((entry) => entry.id === tab)) {
      setTab("overview");
    }
  }, [tab, tabs]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const authToken = token;
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [nextMetadata, nextSummary, nextRecommendations, nextAnnouncements] = await Promise.all([
          api.getMetadata(authToken),
          api.getSummary(authToken),
          api.getRecommendations(authToken),
          api.getAnnouncements(authToken),
        ]);

        if (cancelled) {
          return;
        }

        setMetadata(nextMetadata);
        setSummary(nextSummary);
        setRecommendations(nextRecommendations);
        setAnnouncements(nextAnnouncements.announcements);
        setAnnouncementStreamSinceId((current) => current ?? nextAnnouncements.announcements[0]?.id ?? "");

        if (isAdmin) {
          const adminUsers = await api.getUsers(authToken);
          if (!cancelled) {
            setUsers(adminUsers.users);
          }
        } else if (!cancelled) {
          setUsers([]);
        }
      } catch (issue) {
        if (!cancelled) {
          setError(issue instanceof Error ? issue.message : "Unable to load service information.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, token]);

  if (!token || !user) {
    return null;
  }

  const genderOptions = metadata?.accepted_genders ?? ["Female", "Male", "Other"];
  const transportOptions = metadata?.accepted_transport_modes ?? [
    "Walking",
    "Bike",
    "Bicycle",
    "Car",
    "Public Transport",
    "EV",
  ];

  const handleCitizenPredict = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusySection("citizen");
    setError(null);

    try {
      const result = await api.predictCitizen(citizenForm, token);
      setCitizenResult(result);
      setCitizenResultView("summary");
      setTab("citizen");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "We could not prepare your guidance right now.");
    } finally {
      setBusySection(null);
    }
  };

  const handleCityPredict = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusySection("city");
    setError(null);

    try {
      const result = await api.predictCity({ citizens: cityForms }, token);
      setCityResult(result);
      setTab("city");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "We could not complete the city planning forecast.");
    } finally {
      setBusySection(null);
    }
  };

  const refreshAnnouncements = async () => {
    const nextAnnouncements = await api.getAnnouncements(token);
    setAnnouncements(nextAnnouncements.announcements);
    setAnnouncementStreamSinceId((current) => current ?? nextAnnouncements.announcements[0]?.id ?? "");
  };

  const handleIncomingAnnouncement = useCallback((announcement: Announcement) => {
    setAnnouncements((current) => {
      if (current.some((item) => item.id === announcement.id)) {
        return current;
      }

      return [announcement, ...current];
    });
    setAnnouncementStreamSinceId(announcement.id);
  }, []);

  useAnnouncementNotifications({
    enabled: !loading,
    token,
    role: user?.role ?? null,
    initialSinceId: announcementStreamSinceId,
    onAnnouncement: handleIncomingAnnouncement,
  });

  const handleAnnouncementSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusySection("broadcast");
    setError(null);

    try {
      await api.createAnnouncement(announcementForm, token);
      setAnnouncementForm({ title: "", message: "", audience_role: "citizen" });
      await refreshAnnouncements();
      setTab("announcements");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "We could not publish the notice.");
    } finally {
      setBusySection(null);
    }
  };

  const handleAnnouncementDelete = async (announcementId: string) => {
    const shouldDelete = window.confirm("Delete this service notice now?");
    if (!shouldDelete) {
      return;
    }

    setDeletingAnnouncementId(announcementId);
    setError(null);

    try {
      await api.deleteAnnouncement(announcementId, token);
      setAnnouncements((current) => current.filter((item) => item.id !== announcementId));
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "We could not delete the notice.");
    } finally {
      setDeletingAnnouncementId(null);
    }
  };

  const handleRecommendationsShortcut = () => {
    if (!isAdmin) {
      setCitizenResultView("recommendations");
      setTab("citizen");
      return;
    }

    setTab("overview");
  };

  const addCityCitizen = () => {
    setCityForms((current) => [...current, { ...defaultCitizenForm(), Citizen_ID: current.length + 1 }]);
  };

  const updateCityCitizen = (index: number, nextValue: CitizenPredictionForm) => {
    setCityForms((current) => current.map((item, itemIndex) => (itemIndex === index ? nextValue : item)));
  };

  const removeCityCitizen = (index: number) => {
    setCityForms((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const statusText = loading
    ? "Refreshing service information"
    : error
      ? "Some information needs attention"
      : "Service information is up to date";

  return (
    <main className="dashboard-page">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <aside className="sidebar" aria-label="Primary navigation">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <img className="sidebar-logo" src="/smart-city-logo.png" alt="" />
            <div>
              <div className="eyebrow">Sustainable City Services</div>
              <h1>{isAdmin ? "Green city administration" : "Sustainable living portal"}</h1>
            </div>
          </div>
          <p className="sidebar-copy">
            {isAdmin
              ? "Support cleaner transport, lower emissions, and better community planning with one operational workspace."
              : "Access guidance, notices, and citizen tools that support greener everyday living."}
          </p>
        </div>

        <div className="profile-card sidebar-profile-card">
          <div className="profile-card-header">
            <span className="profile-avatar" aria-hidden="true">
              <AppIcon name="profile" />
            </span>
            <div>
              <span className="profile-label">{isAdmin ? "Authorized officer" : "Citizen account"}</span>
              <strong>{user.full_name}</strong>
            </div>
          </div>
          <span>{user.email}</span>
          <br/>
          <small>{user.profile.city ? `${user.profile.city} service area` : "Service area not provided"}</small>
          <br/>
          <small>Last sign-in: {formatShortDate(user.last_login_at)}</small>
          <br/>
          <button className="ghost-button profile-quick-action" type="button" onClick={() => setTab("profile")}>
            <AppIcon name="profile" />
            View profile
          </button>
        </div>

        <nav className="tab-list" aria-label="Portal sections">
          {tabs.map((entry) => (
            <button
              key={entry.id}
              aria-current={tab === entry.id ? "page" : undefined}
              className={tab === entry.id ? "tab-button active" : "tab-button"}
              type="button"
              onClick={() => {
                if (entry.id === "citizen") {
                  setCitizenResultView("summary");
                }
                setTab(entry.id);
              }}
            >
              <span className="tab-button-icon" aria-hidden="true">
                <AppIcon name={entry.icon} />
              </span>
              <span>{entry.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-badge" type="button" onClick={handleRecommendationsShortcut}>
            <AppIcon name="spark" />
            <span>{isAdmin ? "Planning for cleaner communities" : "Small daily choices help reduce city emissions"}</span>
          </button>
          <button className="secondary-button sidebar-logout" type="button" onClick={logout}>
            <AppIcon name="logout" />
            Sign out
          </button>
        </div>
      </aside>

      <section className="content-area" id="main-content">
        <header className="page-header">
          <div>
            <div className="eyebrow">
              <AppIcon className="eyebrow-icon" name={currentTab.icon} />
              {isAdmin ? "Administration" : "Citizen Services"}
            </div>
            <div className="header-title">
              <span className="header-icon" aria-hidden="true">
                <AppIcon name={currentTab.icon} />
              </span>
              <h2>{tabTitle(tab, isAdmin)}</h2>
            </div>
            <p className="page-subtitle">{tabDescription(tab, isAdmin)}</p>
          </div>
          <div className="status-pill" role="status" aria-live="polite">
            <span className={`status-dot ${error ? "warning" : loading ? "pending" : "online"}`}></span>
            {statusText}
          </div>
        </header>

        {error ? <div className="alert error">{error}</div> : null}

        {loading ? (
          <div className="panel soft-panel">
            <div className="panel-title">
              <AppIcon name="spark" />
              <div className="panel-title-copy">
                <div className="panel-heading">Preparing your information</div>
                <p>We are loading account details, announcements, and service planning data.</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {tab === "overview" ? (
              isAdmin ? (
                <AdminOverview announcements={announcements} recommendations={recommendations} summary={summary} usersCount={users.length} />
              ) : (
                <CitizenOverview
                  announcements={announcements}
                  recommendations={recommendations}
                  summary={summary}
                  user={user}
                  onOpenProfile={() => setTab("profile")}
                  onOpenGuidance={() => setTab("citizen")}
                  onOpenAnnouncements={() => setTab("announcements")}
                />
              )
            ) : null}

            {tab === "profile" ? <ProfileDetailsPage isAdmin={isAdmin} user={user} onOpenGuidance={() => setTab("citizen")} /> : null}

            {tab === "citizen" ? (
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
                    onChange={setCitizenForm}
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
                        {showCitizenRecommendationsOnly ? "Personal recommendations" : "Guidance summary"}
                      </div>
                      <p>
                        {showCitizenRecommendationsOnly
                          ? "Review only the practical recommendations from your latest sustainability check."
                          : "Review estimated daily and monthly impact alongside practical sustainability recommendations."}
                      </p>
                    </div>
                  </div>
                  {citizenResult ? (
                    <>
                      {!showCitizenRecommendationsOnly ? (
                        <div className="stats-grid single-column">
                          <StatCard
                            icon="energy"
                            label="Personal energy estimate"
                            value={`${formatNumber(citizenResult.predictions.predicted_energy_consumption_kwh)} kWh`}
                          />
                          <StatCard
                            icon="carbon"
                            label="Estimated carbon footprint"
                            value={`${formatNumber(citizenResult.predictions.predicted_carbon_footprint_kgco2)} kgCO2`}
                            tone="warm"
                          />
                          <StatCard
                            icon="leaf"
                            label="Sustainability band"
                            value={citizenResult.predictions.sustainability_band}
                            tone="cool"
                          />
                          <StatCard
                            icon="energy"
                            label="Average energy per day"
                            value={`${formatNumber(citizenResult.predictions.daily_average.predicted_energy_consumption_kwh)} kWh`}
                          />
                          <StatCard
                            icon="carbon"
                            label="Average carbon per day"
                            value={`${formatNumber(citizenResult.predictions.daily_average.predicted_carbon_footprint_kgco2)} kgCO2`}
                            tone="warm"
                          />
                          <StatCard
                            icon="energy"
                            label="Projected energy per 30-day month"
                            value={`${formatNumber(citizenResult.predictions.monthly_average.predicted_energy_consumption_kwh)} kWh`}
                          />
                          <StatCard
                            icon="carbon"
                            label="Projected carbon per 30-day month"
                            value={`${formatNumber(citizenResult.predictions.monthly_average.predicted_carbon_footprint_kgco2)} kgCO2`}
                            tone="warm"
                          />
                        </div>
                      ) : null}

                      <RecommendationBlock
                        icon="transport"
                        title="Lower-impact travel and lifestyle options"
                        items={citizenResult.recommendations.eco_friendly_alternatives}
                      />
                      <RecommendationBlock
                        icon="energy"
                        title="Household energy saving tips"
                        items={citizenResult.recommendations.energy_saving_tips}
                      />
                      <RecommendationBlock
                        icon="spark"
                        title="Wellbeing suggestions"
                        items={citizenResult.recommendations.health_suggestions}
                      />
                    </>
                  ) : (
                    <div className="empty-state">
                      {showCitizenRecommendationsOnly
                        ? "Run the personal sustainability check first; recommendations will appear here after the prediction is ready."
                        : "Complete the form to receive tailored guidance, household energy estimates, and practical next steps."}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {tab === "city" && isAdmin ? (
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
                    <button className="secondary-button" type="button" onClick={addCityCitizen}>
                      <AppIcon name="profile" />
                      Add profile
                    </button>
                  </div>

                  <div className="city-form-list">
                    {cityForms.map((formValue, index) => (
                      <div className="city-citizen-card" key={`city-citizen-${index}`}>
                        <div className="section-header">
                          <strong>Profile #{index + 1}</strong>
                          {cityForms.length > 1 ? (
                            <button className="ghost-button" type="button" onClick={() => removeCityCitizen(index)}>
                              Remove
                            </button>
                          ) : null}
                        </div>
                        <CitizenForm
                          compact
                          showCitizenId
                          value={formValue}
                          onChange={(nextValue) => updateCityCitizen(index, nextValue)}
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
                        <StatCard
                          icon="energy"
                          label="Average energy per person per day"
                          value={`${formatNumber(cityResult.average_per_person.daily_average.predicted_energy_consumption_kwh)} kWh`}
                        />
                        <StatCard
                          icon="carbon"
                          label="Average carbon per person per day"
                          value={`${formatNumber(cityResult.average_per_person.daily_average.predicted_carbon_footprint_kgco2)} kgCO2`}
                          tone="warm"
                        />
                        <StatCard
                          icon="energy"
                          label="Average energy per person per month"
                          value={`${formatNumber(cityResult.average_per_person.monthly_average.predicted_energy_consumption_kwh)} kWh`}
                        />
                        <StatCard
                          icon="carbon"
                          label="Average carbon per person per month"
                          value={`${formatNumber(cityResult.average_per_person.monthly_average.predicted_carbon_footprint_kgco2)} kgCO2`}
                          tone="warm"
                        />
                        <StatCard
                          icon="carbon"
                          label="Total carbon footprint"
                          value={`${formatNumber(cityResult.total_predicted_carbon_kgco2)} kgCO2`}
                        />
                        <StatCard
                          icon="energy"
                          label="Total energy demand"
                          value={`${formatNumber(cityResult.total_predicted_energy_kwh)} kWh`}
                        />
                      </div>

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
                                <td>{item.predictions.sustainability_band}</td>
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
            ) : null}

            {tab === "announcements" ? (
              <div className="panel">
                <div className="panel-title">
                  <AppIcon name="notice" />
                  <div className="panel-title-copy">
                    <div className="panel-heading">{isAdmin ? "Published notices" : "Official service notices"}</div>
                    <p>
                      {isAdmin
                        ? "Review notices that have been published for citizens and service teams."
                        : "Stay informed about sustainability programs, public updates, and local authority announcements."}
                    </p>
                  </div>
                </div>
                <AnnouncementListPage
                  announcements={announcements}
                  deletingAnnouncementId={deletingAnnouncementId}
                  isAdmin={isAdmin}
                  onDelete={isAdmin ? handleAnnouncementDelete : undefined}
                />
              </div>
            ) : null}

            {tab === "metadata" && isAdmin ? (
              metadata ? (
                <ServiceDataOverview metadata={metadata} />
              ) : (
                <div className="panel">
                  <div className="empty-state">Service configuration details are not available right now.</div>
                </div>
              )
            ) : null}

            {tab === "users" && isAdmin ? (
              <div className="panel">
                <div className="panel-title">
                  <AppIcon name="users" />
                  <div className="panel-title-copy">
                    <div className="panel-heading">Registered users</div>
                    <p>View the current list of users who can access this service platform.</p>
                  </div>
                </div>
                <UsersTable users={users} />
              </div>
            ) : null}

            {tab === "broadcast" && isAdmin ? (
              <form className="panel panel-narrow" onSubmit={handleAnnouncementSubmit}>
                <div className="panel-title">
                  <AppIcon name="broadcast" />
                  <div className="panel-title-copy">
                    <div className="panel-heading">Publish a service notice</div>
                    <p>Share a clear message with citizens or with all platform users when services change or new green initiatives are introduced.</p>
                  </div>
                </div>
                <label className="field">
                  <span>Notice title</span>
                  <input
                    type="text"
                    value={announcementForm.title}
                    onChange={(event) =>
                      setAnnouncementForm((current) => ({ ...current, title: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Notice message</span>
                  <textarea
                    rows={6}
                    value={announcementForm.message}
                    onChange={(event) =>
                      setAnnouncementForm((current) => ({ ...current, message: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Audience</span>
                  <select
                    value={announcementForm.audience_role}
                    onChange={(event) =>
                      setAnnouncementForm((current) => ({
                        ...current,
                        audience_role: event.target.value as "citizen" | "all",
                      }))
                    }
                  >
                    <option value="citizen">Citizens</option>
                    <option value="all">All users</option>
                  </select>
                </label>
                <button className="primary-button" disabled={busySection === "broadcast"} type="submit">
                  <AppIcon name="broadcast" />
                  {busySection === "broadcast" ? "Publishing notice..." : "Publish notice"}
                </button>
              </form>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

function CitizenOverview({
  announcements,
  recommendations,
  summary,
  user,
  onOpenProfile,
  onOpenGuidance,
  onOpenAnnouncements,
}: {
  announcements: Announcement[];
  recommendations: RecommendationsResponse | null;
  summary: SummaryResponse | null;
  user: User;
  onOpenProfile: () => void;
  onOpenGuidance: () => void;
  onOpenAnnouncements: () => void;
}) {
  const transportEntries = Object.entries(summary?.transport_distribution ?? {});
  const totalProfiles = summary?.citizens_profiled ?? 0;

  return (
    <div className="dashboard-grid">
      <div className="panel span-full panel-accent">
        <div className="section-header">
          <div>
            <div className="panel-title">
              <AppIcon name="leaf" />
              <div className="panel-title-copy">
                <div className="panel-heading">Welcome, {firstName(user.full_name)}</div>
                <p>Track local updates, review sustainability guidance, and take practical steps toward greener daily living.</p>
              </div>
            </div>
          </div>
          <span className="summary-badge">{profileStatusLabel(user)}</span>
        </div>

        <div className="stats-grid">
          <StatCard icon="location" label="Service area" value={user.profile.city ?? "Not provided"} tone="cool" />
          <StatCard icon="calendar" label="Last sign-in" value={formatShortDate(user.last_login_at)} />
          <StatCard icon="notice" label="Available notices" value={String(announcements.length)} />
          <StatCard
            icon="transport"
            label="Common local travel"
            value={summary?.most_common_transport_mode ?? "No data yet"}
            tone="warm"
          />
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <AppIcon name="spark" />
          <div className="panel-title-copy">
            <div className="panel-heading">Your next steps</div>
            <p>Use the portal in a simple, focused way.</p>
          </div>
        </div>
        <div className="action-list">
          <button className="action-card" type="button" onClick={onOpenProfile}>
            <span className="action-card-icon">
              <AppIcon name="profile" />
            </span>
            <span className="action-card-copy">
              <strong>Review your profile</strong>
              <small>Check your service area, contact information, and account details.</small>
            </span>
          </button>
          <button className="action-card" type="button" onClick={onOpenGuidance}>
            <span className="action-card-icon">
              <AppIcon name="guidance" />
            </span>
            <span className="action-card-copy">
              <strong>Run a guidance check</strong>
              <small>Estimate household energy use and carbon impact with plain-language advice.</small>
            </span>
          </button>
          <button className="action-card" type="button" onClick={onOpenAnnouncements}>
            <span className="action-card-icon">
              <AppIcon name="notice" />
            </span>
            <span className="action-card-copy">
              <strong>Stay informed</strong>
              <small>Read new notices about services, programs, and local green initiatives.</small>
            </span>
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <AppIcon name="leaf" />
          <div className="panel-title-copy">
            <div className="panel-heading">Greener living guidance</div>
            <p>Suggestions shaped by current community insights.</p>
          </div>
        </div>
        {recommendations?.city_recommendations.length ? (
          <ul className="idea-list">
            {recommendations.city_recommendations.slice(0, 4).map((idea) => (
              <li key={idea}>{idea}</li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">Community guidance will appear here when updated information is available.</div>
        )}
      </div>

      <div className="panel">
        <div className="panel-title">
          <AppIcon name="overview" />
          <div className="panel-title-copy">
            <div className="panel-heading">Community sustainability snapshot</div>
            <p>A quick view of shared local trends.</p>
          </div>
        </div>
        {summary ? (
          <div className="metric-list">
            <MetricLine icon="users" label="Citizens profiled" value={formatCompactNumber(summary.citizens_profiled)} />
            <MetricLine
              icon="energy"
              label="Average household energy"
              value={`${formatNumber(summary.average_predicted_energy_kwh)} kWh`}
            />
            <MetricLine
              icon="carbon"
              label="Average carbon footprint"
              value={`${formatNumber(summary.average_predicted_carbon_kgco2)} kgCO2`}
            />
            <MetricLine
              icon="transport"
              label="Most common transport"
              value={summary.most_common_transport_mode ?? "Not available"}
            />
          </div>
        ) : (
          <div className="empty-state">A community summary will appear here once service data is available.</div>
        )}
      </div>

      <div className="panel">
        <div className="panel-title">
          <AppIcon name="transport" />
          <div className="panel-title-copy">
            <div className="panel-heading">Transport distribution</div>
            <p>Travel patterns across analyzed community profiles.</p>
          </div>
        </div>
        {transportEntries.length && totalProfiles > 0 ? (
          <div className="transport-bars">
            {transportEntries.map(([mode, count]) => (
              <div key={mode} className="transport-row">
                <div className="transport-label">
                  <span>{mode}</span>
                  <strong>{count}</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${Math.min((count / totalProfiles) * 100, 100)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">Transport distribution will appear here once profile data is available.</div>
        )}
      </div>

      <div className="panel">
        <div className="panel-title">
          <AppIcon name="notice" />
          <div className="panel-title-copy">
            <div className="panel-heading">Latest service notices</div>
            <p>Official local authority updates.</p>
          </div>
        </div>
        <LatestNotices announcements={announcements} emptyMessage="There are no published notices at the moment." />
      </div>
    </div>
  );
}

function AdminOverview({
  announcements,
  recommendations,
  summary,
  usersCount,
}: {
  announcements: Announcement[];
  recommendations: RecommendationsResponse | null;
  summary: SummaryResponse | null;
  usersCount: number;
}) {
  const transportEntries = Object.entries(summary?.transport_distribution ?? {});
  const totalProfiles = summary?.citizens_profiled ?? 0;

  return (
    <div className="dashboard-grid">
      <div className="panel span-full panel-accent">
        <div className="section-header">
          <div className="panel-title">
            <AppIcon name="city" />
            <div className="panel-title-copy">
              <div className="panel-heading">Sustainability operations summary</div>
              <p>Monitor planning information, public communication, and citizen activity from one workspace.</p>
            </div>
          </div>
          <span className="summary-badge">Operational view</span>
        </div>

        <div className="stats-grid">
          <StatCard
            icon="users"
            label="Citizens profiled"
            value={formatCompactNumber(summary?.citizens_profiled ?? 0)}
            tone="cool"
          />
          <StatCard
            icon="energy"
            label="Total energy demand"
            value={`${formatCompactNumber(summary?.total_city_energy_kwh ?? 0)} kWh`}
          />
          <StatCard
            icon="carbon"
            label="Total carbon footprint"
            value={`${formatCompactNumber(summary?.total_city_carbon_kgco2 ?? 0)} kgCO2`}
            tone="warm"
          />
          <StatCard icon="users" label="Registered users" value={formatCompactNumber(usersCount)} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <AppIcon name="spark" />
          <div className="panel-title-copy">
            <div className="panel-heading">Sustainability priorities</div>
            <p>Actions suggested by current city patterns.</p>
          </div>
        </div>
        {recommendations?.city_recommendations.length ? (
          <ul className="idea-list">
            {recommendations.city_recommendations.map((idea) => (
              <li key={idea}>{idea}</li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">Recommended planning actions will appear here when data is available.</div>
        )}
      </div>

      <div className="panel">
        <div className="panel-title">
          <AppIcon name="overview" />
          <div className="panel-title-copy">
            <div className="panel-heading">Platform activity</div>
            <p>Service communication and usage indicators.</p>
          </div>
        </div>
        <div className="metric-list">
          <MetricLine icon="notice" label="Published notices" value={String(announcements.length)} />
          <MetricLine icon="users" label="Registered users" value={String(usersCount)} />
          <MetricLine icon="transport" label="Most common transport" value={summary?.most_common_transport_mode ?? "Not available"} />
          <MetricLine icon="overview" label="Profiles analyzed" value={formatCompactNumber(totalProfiles)} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <AppIcon name="transport" />
          <div className="panel-title-copy">
            <div className="panel-heading">Transport distribution</div>
            <p>Travel patterns across analyzed profiles.</p>
          </div>
        </div>
        {transportEntries.length && totalProfiles > 0 ? (
          <div className="transport-bars">
            {transportEntries.map(([mode, count]) => (
              <div key={mode} className="transport-row">
                <div className="transport-label">
                  <span>{mode}</span>
                  <strong>{count}</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${Math.min((count / totalProfiles) * 100, 100)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">Transport distribution will appear here once profile data is available.</div>
        )}
      </div>

      <div className="panel">
        <div className="panel-title">
          <AppIcon name="notice" />
          <div className="panel-title-copy">
            <div className="panel-heading">Latest public notices</div>
            <p>Recent announcements shared with users.</p>
          </div>
        </div>
        <LatestNotices announcements={announcements} emptyMessage="No public notices have been published yet." />
      </div>
    </div>
  );
}

function ProfileDetailsPage({
  isAdmin,
  user,
  onOpenGuidance,
}: {
  isAdmin: boolean;
  user: User;
  onOpenGuidance: () => void;
}) {
  const personalDetails = [
    { icon: "profile" as AppIconName, label: "Full name", value: user.full_name },
    { icon: "mail" as AppIconName, label: "Email", value: user.email },
    { icon: "location" as AppIconName, label: "City", value: user.profile.city ?? "Not provided" },
    { icon: "calendar" as AppIconName, label: "Member since", value: formatShortDate(user.created_at) },
  ];

  const contactDetails = [
    { icon: "phone" as AppIconName, label: "Phone", value: user.profile.phone ?? "Not provided" },
    { icon: "location" as AppIconName, label: "Address", value: user.profile.address ?? "Not provided" },
    { icon: "profile" as AppIconName, label: "Gender", value: user.profile.gender ?? "Not provided" },
    { icon: "calendar" as AppIconName, label: "Age", value: user.profile.age ? String(user.profile.age) : "Not provided" },
  ];

  return (
    <div className="dashboard-grid">
      <div className="panel span-full panel-accent">
        <div className="section-header">
          <div className="panel-title">
            <AppIcon name="profile" />
            <div className="panel-title-copy">
              <div className="panel-heading">Profile details</div>
              <p>Review the account information associated with your sustainable city services access.</p>
            </div>
          </div>
          <span className="summary-badge">{isAdmin ? "Administrative account" : "Citizen account"}</span>
        </div>

        <div className="stats-grid">
          <StatCard icon="shield" label="Account role" value={isAdmin ? "Administrator" : "Citizen"} tone="cool" />
          <StatCard icon="calendar" label="Last sign-in" value={formatShortDate(user.last_login_at)} />
          <StatCard icon="location" label="Service area" value={user.profile.city ?? "Not provided"} />
          <StatCard icon="leaf" label="Profile status" value={profileStatusLabel(user)} tone="warm" />
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <AppIcon name="profile" />
          <div className="panel-title-copy">
            <div className="panel-heading">Account information</div>
            <p>Your core identity details for this service.</p>
          </div>
        </div>
        <div className="metric-list">
          {personalDetails.map((item) => (
            <MetricLine key={item.label} icon={item.icon} label={item.label} value={item.value} />
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <AppIcon name="mail" />
          <div className="panel-title-copy">
            <div className="panel-heading">Contact and profile details</div>
            <p>Information used for relevant communication and service context.</p>
          </div>
        </div>
        <div className="metric-list">
          {contactDetails.map((item) => (
            <MetricLine key={item.label} icon={item.icon} label={item.label} value={item.value} />
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <AppIcon name="spark" />
          <div className="panel-title-copy">
            <div className="panel-heading">Helpful actions</div>
            <p>Quick paths to the most relevant service tools.</p>
          </div>
        </div>
        <div className="action-list">
          <button className="action-card" type="button" onClick={onOpenGuidance}>
            <span className="action-card-icon">
              <AppIcon name="guidance" />
            </span>
            <span className="action-card-copy">
              <strong>{isAdmin ? "Open citizen assessment" : "Open personal guidance"}</strong>
              <small>{isAdmin ? "Run planning assessments for households and service scenarios." : "Receive sustainability guidance based on household details."}</small>
            </span>
          </button>
          <div className="action-card static">
            <span className="action-card-icon">
              <AppIcon name="shield" />
            </span>
            <span className="action-card-copy">
              <strong>Account support</strong>
              <small>Contact your local authority help desk if any profile details need correction.</small>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LatestNotices({
  announcements,
  emptyMessage,
}: {
  announcements: Announcement[];
  emptyMessage: string;
}) {
  if (!announcements.length) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="announcement-list">
      {announcements.slice(0, 3).map((item) => (
        <article className="announcement-card" key={item.id}>
          <div className="announcement-meta">
            <span>{formatAudienceLabel(item.audience_role)}</span>
            <small>{formatShortDate(item.created_at)}</small>
          </div>
          <h3>{item.title}</h3>
          <p>{item.message}</p>
        </article>
      ))}
    </div>
  );
}

function AnnouncementListPage({
  announcements,
  deletingAnnouncementId,
  isAdmin,
  onDelete,
}: {
  announcements: Announcement[];
  deletingAnnouncementId: string | null;
  isAdmin: boolean;
  onDelete?: (announcementId: string) => void;
}) {
  if (!announcements.length) {
    return (
      <div className="empty-state">
        {isAdmin ? "No notices have been published yet." : "There are no notices to display at the moment."}
      </div>
    );
  }

  return (
    <div className="announcement-list">
      {announcements.map((item) => (
        <article className="announcement-card" key={item.id}>
          <div className="announcement-meta">
            <span>{formatAudienceLabel(item.audience_role)}</span>
            <small>{formatDate(item.created_at)}</small>
          </div>
          <h3>{item.title}</h3>
          <p>{item.message}</p>
          <footer className="announcement-footer">
            <span>Posted by {item.created_by.full_name}</span>
            {isAdmin && onDelete ? (
              <button
                className="ghost-button announcement-delete-button"
                disabled={deletingAnnouncementId === item.id}
                type="button"
                onClick={() => onDelete(item.id)}
              >
                {deletingAnnouncementId === item.id ? "Deleting..." : "Delete"}
              </button>
            ) : null}
          </footer>
        </article>
      ))}
    </div>
  );
}

function ServiceDataOverview({ metadata }: { metadata: MetadataResponse }) {
  return (
    <div className="dashboard-grid">
      <div className="panel">
        <div className="panel-title">
          <AppIcon name="data" />
          <div className="panel-title-copy">
            <div className="panel-heading">Accepted profile categories</div>
            <p>Supported values used across service forms.</p>
          </div>
        </div>
        <div className="chip-group">
          {metadata.accepted_genders.map((item) => (
            <span className="info-chip" key={item}>
              {item}
            </span>
          ))}
        </div>
        <div className="chip-group">
          {metadata.accepted_transport_modes.map((item) => (
            <span className="info-chip transport" key={item}>
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <AppIcon name="overview" />
          <div className="panel-title-copy">
            <div className="panel-heading">Assessment fields</div>
            <p>Available inputs for profile and planning assessments.</p>
          </div>
        </div>
        <div className="metric-list">
          {Object.entries(metadata.required_prediction_fields).map(([field, type]) => (
            <MetricLine key={field} icon="data" label={formatFieldLabel(field)} value={formatFieldType(type)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function UsersTable({ users }: { users: User[] }) {
  if (!users.length) {
    return <div className="empty-state">No user accounts are available to display.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>City</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {users.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.full_name}</td>
              <td>{entry.email}</td>
              <td>{entry.role}</td>
              <td>{entry.profile.city ?? "N/A"}</td>
              <td>{formatShortDate(entry.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function tabTitle(tab: AppTab, isAdmin: boolean) {
  switch (tab) {
    case "overview":
      return isAdmin ? "Sustainability overview" : "Citizen overview";
    case "profile":
      return "Profile details";
    case "citizen":
      return isAdmin ? "Citizen assessment" : "Personal guidance";
    case "city":
      return "Green city planning";
    case "announcements":
      return isAdmin ? "Public notices" : "Service notices";
    case "metadata":
      return "Service data";
    case "users":
      return "Registered users";
    case "broadcast":
      return "Publish notice";
    default:
      return "Sustainable city services";
  }
}

function tabDescription(tab: AppTab, isAdmin: boolean) {
  switch (tab) {
    case "overview":
      return isAdmin
        ? "Review service activity, planning indicators, and public communication for greener communities."
        : "See the most important local updates, guidance, and sustainability activity in one place.";
    case "profile":
      return "View the details linked to your account and service access.";
    case "citizen":
      return isAdmin
        ? "Prepare household impact estimates for service planning or case review."
        : "Receive clear household guidance and estimated energy and carbon impact.";
    case "city":
      return "Use aggregated profiles to support greener operational planning and service decisions.";
    case "announcements":
      return "Read published notices and official updates from the local authority.";
    case "metadata":
      return "Review the accepted categories and fields used by the sustainability service forms.";
    case "users":
      return "See who currently has access to the citizen service platform.";
    case "broadcast":
      return "Publish a clear notice to citizens or all users of the platform.";
    default:
      return "Sustainable city services workspace.";
  }
}

function StatCard({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: AppIconName;
  label: string;
  value: string;
  tone?: "default" | "warm" | "cool";
}) {
  return (
    <div className={`stat-card ${tone}`}>
      <span className="stat-card-icon">
        <AppIcon name={icon} />
      </span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetricLine({
  icon,
  label,
  value,
}: {
  icon: AppIconName;
  label: string;
  value: string;
}) {
  return (
    <div className="metric-line">
      <div className="metric-line-label">
        <span className="metric-line-icon">
          <AppIcon name={icon} />
        </span>
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function RecommendationBlock({
  icon,
  title,
  items,
}: {
  icon: AppIconName;
  title: string;
  items: string[];
}) {
  return (
    <section className="recommendation-block">
      <div className="panel-title compact">
        <AppIcon name={icon} />
        <div className="panel-title-copy">
          <h3>{title}</h3>
        </div>
      </div>
      {items.length ? (
        <ul className="idea-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">No guidance is available for this section yet.</div>
      )}
    </section>
  );
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] ?? value;
}

function profileStatusLabel(user: User) {
  const details = [user.profile.age, user.profile.gender, user.profile.city, user.profile.phone, user.profile.address];
  const completed = details.filter(Boolean).length;
  return completed >= 3 ? "Profile active" : "Profile details pending";
}

function formatAudienceLabel(value: Announcement["audience_role"]) {
  return value === "all" ? "All users" : "Citizens";
}

function formatFieldLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatFieldType(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
