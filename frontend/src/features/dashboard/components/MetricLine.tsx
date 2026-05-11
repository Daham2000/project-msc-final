import { AppIcon, type AppIconName } from "../../../components/AppIcon";

interface MetricLineProps {
  icon: AppIconName;
  label: string;
  value: string;
}

export function MetricLine({ icon, label, value }: MetricLineProps) {
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
