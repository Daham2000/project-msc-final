import type { AppIconName } from "../../components/AppIcon";

export type DashboardRouteId =
  | "overview"
  | "profile"
  | "citizen"
  | "city"
  | "announcements"
  | "metadata"
  | "users"
  | "broadcast";

export type CitizenResultView = "summary" | "recommendations";

export type DashboardBusySection = "citizen" | "city" | "broadcast" | null;

export type DashboardNavGroup = "Workspace" | "Administration";

export interface DashboardNavItem {
  id: DashboardRouteId;
  label: string;
  icon: AppIconName;
  path: string;
  adminOnly?: boolean;
  group: DashboardNavGroup;
}
