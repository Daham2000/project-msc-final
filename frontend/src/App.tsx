import { AuthScreen } from "./features/auth/AuthScreen";
import { DashboardView } from "./features/dashboard/DashboardView";
import { useAuth } from "./auth/AuthContext";

export default function App() {
  const { ready, user } = useAuth();

  if (!ready) {
    return (
      <main className="loading-page">
        <div className="loading-card">
          <div className="eyebrow">Sustainable City Services</div>
          <h1>Preparing your secure workspace</h1>
          <p>We are loading your account details, sustainability notices, and greener living tools.</p>
        </div>
      </main>
    );
  }

  return user ? <DashboardView /> : <AuthScreen />;
}
