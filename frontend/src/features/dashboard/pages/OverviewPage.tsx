import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../auth/AuthContext";
import { AppIcon } from "../../../components/AppIcon";
import { useAppSelector } from "../../../store/hooks";
import { formatCompactNumber, formatNumber, formatShortDate } from "../../../utils/format";
import { LatestNotices } from "../components/LatestNotices";
import { MetricLine } from "../components/MetricLine";
import { StatCard } from "../components/StatCard";
import { firstName, profileStatusLabel } from "../utils";

export function OverviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { announcements, recommendations, summary, users } = useAppSelector((state) => state.dashboard);

  if (!user) {
    return null;
  }

  const transportEntries = Object.entries(summary?.transport_distribution ?? {});
  const totalProfiles = summary?.citizens_profiled ?? 0;

  if (user.role === "admin") {
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
            <StatCard icon="users" label="Citizens profiled" value={formatCompactNumber(summary?.citizens_profiled ?? 0)} tone="cool" />
            <StatCard icon="energy" label="Total energy demand" value={`${formatCompactNumber(summary?.total_city_energy_kwh ?? 0)} kWh`} />
            <StatCard icon="carbon" label="Total carbon footprint" value={`${formatCompactNumber(summary?.total_city_carbon_kgco2 ?? 0)} kgCO2`} tone="warm" />
            <StatCard icon="users" label="Registered users" value={formatCompactNumber(users.length)} />
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
            <MetricLine icon="users" label="Registered users" value={String(users.length)} />
            <MetricLine icon="transport" label="Most common transport" value={summary?.most_common_transport_mode ?? "Not available"} />
            <MetricLine icon="overview" label="Profiles analyzed" value={formatCompactNumber(totalProfiles)} />
          </div>
        </div>

        <TransportDistribution transportEntries={transportEntries} totalProfiles={totalProfiles} />

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
          <StatCard icon="transport" label="Common local travel" value={summary?.most_common_transport_mode ?? "No data yet"} tone="warm" />
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
          <button className="action-card" type="button" onClick={() => navigate("/profile")}>
            <span className="action-card-icon"><AppIcon name="profile" /></span>
            <span className="action-card-copy">
              <strong>Review your profile</strong>
              <small>Check your service area, contact information, and account details.</small>
            </span>
          </button>
          <button className="action-card" type="button" onClick={() => navigate("/citizen")}>
            <span className="action-card-icon"><AppIcon name="guidance" /></span>
            <span className="action-card-copy">
              <strong>Run a guidance check</strong>
              <small>Estimate household energy use and carbon impact with plain-language advice.</small>
            </span>
          </button>
          <button className="action-card" type="button" onClick={() => navigate("/announcements")}>
            <span className="action-card-icon"><AppIcon name="notice" /></span>
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
            <MetricLine icon="energy" label="Average household energy" value={`${formatNumber(summary.average_predicted_energy_kwh)} kWh`} />
            <MetricLine icon="carbon" label="Average carbon footprint" value={`${formatNumber(summary.average_predicted_carbon_kgco2)} kgCO2`} />
            <MetricLine icon="transport" label="Most common transport" value={summary.most_common_transport_mode ?? "Not available"} />
          </div>
        ) : (
          <div className="empty-state">A community summary will appear here once service data is available.</div>
        )}
      </div>

      <TransportDistribution transportEntries={transportEntries} totalProfiles={totalProfiles} />

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

function TransportDistribution({
  transportEntries,
  totalProfiles,
}: {
  transportEntries: [string, number][];
  totalProfiles: number;
}) {
  return (
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
  );
}
