import { AppIcon, type AppIconName } from "../../../components/AppIcon";

interface StatCardProps {
  icon: AppIconName;
  label: string;
  value: string;
  tone?: "default" | "warm" | "cool";
}

export function StatCard({ icon, label, value, tone = "default" }: StatCardProps) {
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
