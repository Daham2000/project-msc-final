import { Navigate } from "react-router-dom";

import { useAuth } from "../../../auth/AuthContext";
import { AppIcon } from "../../../components/AppIcon";
import { useAppSelector } from "../../../store/hooks";
import { MetricLine } from "../components/MetricLine";
import { formatFieldLabel, formatFieldType } from "../utils";

export function ServiceDataPage() {
  const { user } = useAuth();
  const metadata = useAppSelector((state) => state.dashboard.metadata);

  if (user?.role !== "admin") {
    return <Navigate replace to="/" />;
  }

  if (!metadata) {
    return (
      <div className="panel">
        <div className="empty-state">Service configuration details are not available right now.</div>
      </div>
    );
  }

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
            <span className="info-chip" key={item}>{item}</span>
          ))}
        </div>
        <div className="chip-group">
          {metadata.accepted_transport_modes.map((item) => (
            <span className="info-chip transport" key={item}>{item}</span>
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
