import { AppIcon, type AppIconName } from "../../../components/AppIcon";

interface StatCardProps {
  icon: AppIconName;
  label: string;
  value: string;
  tone?: "default" | "warm" | "cool";
  /** Short qualifier shown top-right, e.g. a trend or a status word. */
  delta?: string;
  /** Only affects the arrow and colour of the delta chip. */
  deltaDirection?: "up" | "down" | "neutral";
}

export function StatCard({
  icon,
  label,
  value,
  tone = "default",
  delta,
  deltaDirection = "neutral",
}: StatCardProps) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-card-header">
        <span className="stat-card-icon">
          <AppIcon name={icon} />
        </span>
        {delta ? (
          <span className={`stat-card-delta ${deltaDirection}`}>
            {deltaDirection === "neutral" ? null : (
              <AppIcon name={deltaDirection === "up" ? "trendUp" : "trendDown"} />
            )}
            {delta}
          </span>
        ) : null}
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
