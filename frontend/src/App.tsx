import { Navigate, Route, Routes } from "react-router-dom";

import { AuthScreen } from "./features/auth/AuthScreen";
import { useAuth } from "./auth/AuthContext";
import { DashboardLayout } from "./features/dashboard/layout/DashboardLayout";
import { AnnouncementsPage } from "./features/dashboard/pages/AnnouncementsPage";
import { BroadcastPage } from "./features/dashboard/pages/BroadcastPage";
import { CitizenGuidancePage } from "./features/dashboard/pages/CitizenGuidancePage";
import { CityPlanningPage } from "./features/dashboard/pages/CityPlanningPage";
import { OverviewPage } from "./features/dashboard/pages/OverviewPage";
import { ProfilePage } from "./features/dashboard/pages/ProfilePage";
import { ServiceDataPage } from "./features/dashboard/pages/ServiceDataPage";
import { UsersPage } from "./features/dashboard/pages/UsersPage";

export default function App() {
  const { ready, user } = useAuth();

  if (!ready) {
    return (
      <main className="loading-page">
        <div className="loading-card">
          <div className="eyebrow">Sustainable City Services</div>
          <h1>Preparing your secure workspace</h1>
          <p>We are getting your account and service notices ready.</p>
        </div>
      </main>
    );
  }

  return user ? (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="citizen" element={<CitizenGuidancePage />} />
        <Route path="city" element={<CityPlanningPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="metadata" element={<ServiceDataPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="broadcast" element={<BroadcastPage />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  ) : (
    <AuthScreen />
  );
}
