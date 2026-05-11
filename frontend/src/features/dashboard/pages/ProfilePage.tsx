import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../auth/AuthContext";
import { AppIcon, type AppIconName } from "../../../components/AppIcon";
import { formatShortDate } from "../../../utils/format";
import { MetricLine } from "../components/MetricLine";
import { StatCard } from "../components/StatCard";
import { profileStatusLabel } from "../utils";

export function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const isAdmin = user.role === "admin";
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
          <button className="action-card" type="button" onClick={() => navigate("/citizen")}>
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
