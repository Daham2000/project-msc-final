import { useCallback, useEffect, useMemo } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../../auth/AuthContext";
import { AppIcon } from "../../../components/AppIcon";
import { useAnnouncementNotifications } from "../../../hooks/useAnnouncementNotifications";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  loadDashboardData,
  receiveAnnouncement,
  resetDashboard,
  setCitizenResultView,
} from "../dashboardSlice";
import {
  getDashboardNavItems,
  getGroupedNavItems,
  getRouteIdForPath,
  getRouteMeta,
  tabDescription,
  tabTitle,
} from "../navigation";

function initialsOf(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function DashboardLayout() {
  const { token, user, logout } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { announcementStreamSinceId, error, loading } = useAppSelector((state) => state.dashboard);

  const isAdmin = user?.role === "admin";
  const routeId = getRouteIdForPath(location.pathname);
  const navItems = useMemo(() => getDashboardNavItems(isAdmin), [isAdmin]);
  const navGroups = useMemo(() => getGroupedNavItems(isAdmin), [isAdmin]);
  const currentRoute = getRouteMeta(routeId, isAdmin);

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    void dispatch(loadDashboardData({ token, isAdmin }));
  }, [dispatch, isAdmin, token, user]);

  useEffect(() => {
    const activeRoute = navItems.find((entry) => entry.path === location.pathname);
    if (!activeRoute) {
      navigate("/", { replace: true });
    }
  }, [location.pathname, navItems, navigate]);

  const handleIncomingAnnouncement = useCallback(
    (announcement: Parameters<typeof receiveAnnouncement>[0]) => {
      dispatch(receiveAnnouncement(announcement));
    },
    [dispatch]
  );

  useAnnouncementNotifications({
    enabled: !loading,
    token,
    role: user?.role ?? null,
    initialSinceId: announcementStreamSinceId,
    onAnnouncement: handleIncomingAnnouncement,
  });

  if (!token || !user) {
    return null;
  }

  const statusText = loading
    ? "Refreshing updates"
    : error
      ? "Needs attention"
      : "Updates are current";

  const handleRecommendationsShortcut = () => {
    if (!isAdmin) {
      dispatch(setCitizenResultView("recommendations"));
      navigate("/citizen");
      return;
    }

    navigate("/");
  };

  const handleLogout = () => {
    dispatch(resetDashboard());
    logout();
  };

  return (
    <main className="dashboard-page">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <aside className="sidebar" aria-label="Primary navigation">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <img className="sidebar-logo" src="/smart-city-logo.png" alt="" />
            <div>
              <div className="eyebrow">Sustainable City Services</div>
              <h1>{isAdmin ? "Green city administration" : "Sustainable living portal"}</h1>
            </div>
          </div>
        </div>

        <div className="profile-card sidebar-profile-card">
          <span className="avatar" aria-hidden="true">
            {initialsOf(user.full_name)}
          </span>
          <div style={{ minWidth: 0 }}>
            <span className="profile-label">{isAdmin ? "Authorized officer" : "Citizen account"}</span>
            <strong>{user.full_name}</strong>
          </div>
        </div>

        <nav aria-label="Portal sections" style={{ display: "grid", overflowY: "auto" }}>
          {navGroups.map((group) => (
            <div className="nav-group" key={group.group}>
              <div className="nav-group-title">{group.group}</div>
              <div className="tab-list">
                {group.items.map((entry) => (
                  <NavLink
                    key={entry.id}
                    className={({ isActive }) => (isActive ? "tab-button active" : "tab-button")}
                    onClick={() => {
                      if (entry.id === "citizen") {
                        dispatch(setCitizenResultView("summary"));
                      }
                    }}
                    to={entry.path}
                  >
                    <span className="tab-button-icon" aria-hidden="true">
                      <AppIcon name={entry.icon} />
                    </span>
                    <span>{entry.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-badge" type="button" onClick={handleRecommendationsShortcut}>
            <AppIcon name="spark" />
            <span>{isAdmin ? "Planning for cleaner communities" : "Small daily choices help reduce city emissions"}</span>
          </button>
          <button className="secondary-button sidebar-logout" type="button" onClick={handleLogout}>
            <AppIcon name="logout" />
            Sign out
          </button>
        </div>
      </aside>

      <section className="content-area" id="main-content">
        <header className="page-header">
          <div>
            <div className="eyebrow">
              <AppIcon className="eyebrow-icon" name={currentRoute.icon} />
              {isAdmin ? "Administration" : "Citizen Services"}
            </div>
            <div className="header-title">
              <span className="header-icon" aria-hidden="true">
                <AppIcon name={currentRoute.icon} />
              </span>
              <h2>{tabTitle(routeId, isAdmin)}</h2>
            </div>
            <p className="page-subtitle">{tabDescription(routeId, isAdmin)}</p>
          </div>
          <div className="status-pill" role="status" aria-live="polite">
            <span className={`status-dot ${error ? "warning" : loading ? "pending" : "online"}`}></span>
            {statusText}
          </div>
        </header>

        {error ? <div className="alert error" role="alert">{error}</div> : null}

        {loading ? (
          <div className="panel soft-panel">
            <div className="panel-title">
              <AppIcon name="spark" />
              <div className="panel-title-copy">
                <div className="panel-heading">Loading your workspace</div>
                <p>Your account details and service notices will appear shortly.</p>
              </div>
            </div>
            <div className="loading-rows" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </section>
    </main>
  );
}
