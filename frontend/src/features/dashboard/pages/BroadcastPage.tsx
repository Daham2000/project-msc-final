import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../../../auth/AuthContext";
import { AppIcon } from "../../../components/AppIcon";
import { MultiSearchableSelect } from "../../../components/SearchableSelect";
import { useCities } from "../../../hooks/useCities";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import type { AudienceScope } from "../../../types/api";
import { createAnnouncement, setAnnouncementForm } from "../dashboardSlice";
import { formatReachLabel } from "../utils";

export function BroadcastPage() {
  const { token, user } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { announcementForm, busySection } = useAppSelector((state) => state.dashboard);
  const { cities, country, loading: citiesLoading, error: citiesError } = useCities();
  const [cityError, setCityError] = useState<string | null>(null);

  if (user?.role !== "admin") {
    return <Navigate replace to="/" />;
  }

  const isIslandWide = announcementForm.audience_scope === "island_wide";

  const handleScopeChange = (scope: AudienceScope) => {
    setCityError(null);
    dispatch(
      setAnnouncementForm({
        ...announcementForm,
        audience_scope: scope,
        // Drop any selection when switching back to island wide so the payload
        // matches what the preview promises.
        cities: scope === "island_wide" ? [] : announcementForm.cities,
      })
    );
  };

  const handleAnnouncementSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    if (!isIslandWide && !announcementForm.cities.length) {
      setCityError("Select at least one city, or switch this notice to island wide.");
      return;
    }

    setCityError(null);
    await dispatch(createAnnouncement({ token, payload: announcementForm }))
      .unwrap()
      .then(() => navigate("/announcements"))
      .catch(() => undefined);
  };

  const isAll = announcementForm.audience_role === "all";

  return (
    <div className="dashboard-grid">
      <form className="panel" onSubmit={handleAnnouncementSubmit}>
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
            onChange={(event) => dispatch(setAnnouncementForm({ ...announcementForm, title: event.target.value }))}
            required
          />
        </label>
        <label className="field">
          <span>Notice message</span>
          <textarea
            rows={6}
            value={announcementForm.message}
            onChange={(event) => dispatch(setAnnouncementForm({ ...announcementForm, message: event.target.value }))}
            required
          />
        </label>
        <label className="field">
          <span>Audience</span>
          <select
            value={announcementForm.audience_role}
            onChange={(event) =>
              dispatch(
                setAnnouncementForm({
                  ...announcementForm,
                  audience_role: event.target.value as "citizen" | "all",
                })
              )
            }
          >
            <option value="citizen">Citizens</option>
            <option value="all">All users</option>
          </select>
        </label>

        <div className="field">
          <span>Reach</span>
          <div className="scope-choice">
            <button
              className={`scope-option ${isIslandWide ? "active" : ""}`}
              onClick={() => handleScopeChange("island_wide")}
              type="button"
            >
              <AppIcon name="city" />
              <span className="scope-option-copy">
                <strong>Island wide</strong>
                <small>Every {country || "serviced"} city receives this notice.</small>
              </span>
            </button>
            <button
              className={`scope-option ${isIslandWide ? "" : "active"}`}
              onClick={() => handleScopeChange("cities")}
              type="button"
            >
              <AppIcon name="location" />
              <span className="scope-option-copy">
                <strong>Selected cities</strong>
                <small>Only citizens registered in the cities you pick.</small>
              </span>
            </button>
          </div>
        </div>

        {!isIslandWide ? (
          <div className="field">
            <span>Target cities</span>
            <MultiSearchableSelect
              disabled={citiesLoading || Boolean(citiesError)}
              emptyMessage="No city matches that search."
              invalid={Boolean(cityError)}
              onChange={(values) => {
                setCityError(null);
                dispatch(setAnnouncementForm({ ...announcementForm, cities: values }));
              }}
              options={cities}
              placeholder={
                citiesLoading
                  ? "Loading cities..."
                  : citiesError
                    ? "City list unavailable"
                    : "Search and select cities"
              }
              values={announcementForm.cities}
            />
            <small className={`field-hint ${cityError ? "error" : ""}`}>
              {cityError ??
                (announcementForm.cities.length
                  ? `${announcementForm.cities.length} of ${cities.length} cities selected.`
                  : "Search by name and select one or more cities.")}
            </small>
          </div>
        ) : null}

        <button className="primary-button" disabled={busySection === "broadcast"} type="submit">
          <AppIcon name="broadcast" />
          {busySection === "broadcast" ? "Publishing notice..." : "Publish notice"}
        </button>
      </form>

      <div className="panel panel-narrow" style={{ alignContent: "start", gap: "0.7rem" }}>
        <div className="live-preview-label">Live preview</div>
        <article className={`announcement-card ${isAll ? "audience-all" : ""}`}>
          <div className="announcement-meta">
            <span>{isAll ? "All users" : "Citizens"}</span>
            <small>Just now</small>
          </div>
          <h3>{announcementForm.title || "Notice title preview"}</h3>
          <p>{announcementForm.message || "Your notice message will appear here as you type."}</p>
          <div className="announcement-reach">
            <AppIcon name={isIslandWide ? "city" : "location"} />
            <span>{formatReachLabel(announcementForm.audience_scope, announcementForm.cities)}</span>
          </div>
        </article>
      </div>
    </div>
  );
}
