import type { DashboardNavGroup, DashboardNavItem, DashboardRouteId } from "./types";

export const dashboardRoutes: DashboardNavItem[] = [
  { id: "overview", label: "Overview", icon: "overview", path: "/", group: "Workspace" },
  { id: "profile", label: "Profile", icon: "profile", path: "/profile", citizenOnly: true, group: "Workspace" },
  { id: "citizen", label: "Guidance", icon: "guidance", path: "/citizen", group: "Workspace" },
  { id: "announcements", label: "Notices", icon: "notice", path: "/announcements", group: "Workspace" },
  { id: "city", label: "City Planning", icon: "city", path: "/city", adminOnly: true, group: "Administration" },
  { id: "users", label: "Users", icon: "users", path: "/users", adminOnly: true, group: "Administration" },
  { id: "broadcast", label: "Publish", icon: "broadcast", path: "/broadcast", adminOnly: true, group: "Administration" },
];

export function getDashboardNavItems(isAdmin: boolean) {
  return dashboardRoutes
    .filter((route) => (isAdmin || !route.adminOnly) && (!isAdmin || !route.citizenOnly))
    .map((route) =>
      route.id === "citizen"
        ? { ...route, label: isAdmin ? "Assessment" : "Guidance" }
        : route
    );
}

export function getGroupedNavItems(isAdmin: boolean) {
  const items = getDashboardNavItems(isAdmin);
  const groups: DashboardNavGroup[] = ["Workspace", "Administration"];
  return groups
    .map((group) => ({ group, items: items.filter((item) => item.group === group) }))
    .filter((entry) => entry.items.length > 0);
}

export function getRouteIdForPath(pathname: string): DashboardRouteId {
  const route = dashboardRoutes.find((entry) => entry.path === pathname);
  return route?.id ?? "overview";
}

export function getRouteMeta(routeId: DashboardRouteId, isAdmin: boolean) {
  return getDashboardNavItems(isAdmin).find((entry) => entry.id === routeId) ?? dashboardRoutes[0];
}

export function tabTitle(routeId: DashboardRouteId, isAdmin: boolean) {
  switch (routeId) {
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
    case "users":
      return "Registered users";
    case "broadcast":
      return "Publish notice";
    default:
      return "Sustainable city services";
  }
}

export function tabDescription(routeId: DashboardRouteId, isAdmin: boolean) {
  switch (routeId) {
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
    case "users":
      return "See who currently has access to the citizen service platform.";
    case "broadcast":
      return "Publish a clear notice to citizens or all users of the platform.";
    default:
      return "Sustainable city services workspace.";
  }
}
