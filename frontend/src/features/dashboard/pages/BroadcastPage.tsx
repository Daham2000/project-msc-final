import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../../../auth/AuthContext";
import { AppIcon } from "../../../components/AppIcon";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { createAnnouncement, setAnnouncementForm } from "../dashboardSlice";

export function BroadcastPage() {
  const { token, user } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { announcementForm, busySection } = useAppSelector((state) => state.dashboard);

  if (user?.role !== "admin") {
    return <Navigate replace to="/" />;
  }

  const handleAnnouncementSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    await dispatch(createAnnouncement({ token, payload: announcementForm }))
      .unwrap()
      .then(() => navigate("/announcements"))
      .catch(() => undefined);
  };

  return (
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
      <button className="primary-button" disabled={busySection === "broadcast"} type="submit">
        <AppIcon name="broadcast" />
        {busySection === "broadcast" ? "Publishing notice..." : "Publish notice"}
      </button>
    </form>
  );
}
