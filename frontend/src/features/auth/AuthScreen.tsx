import { useMemo, useState, type FormEvent } from "react";

import { useAuth } from "../../auth/AuthContext";
import { AppIcon } from "../../components/AppIcon";
import type { RegisterPayload } from "../../types/api";

type AuthMode = "login" | "register";

const initialRegisterState: RegisterPayload = {
  full_name: "",
  email: "",
  password: "",
  age: undefined,
  gender: "",
  city: "",
  phone: "",
  address: "",
};

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState<RegisterPayload>(initialRegisterState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(
    () => (mode === "login" ? "Access your citizen services account" : "Create your citizen services account"),
    [mode]
  );

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await login(loginForm);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to log in.");
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await register(registerForm);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to register.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="auth-hero-brand">
          <img className="sidebar-logo" src="/smart-city-logo.png" alt="" style={{ width: "2.75rem", height: "2.75rem" }} />
          <div className="eyebrow" style={{ marginBottom: 0 }}>Sustainable City Services</div>
        </div>

        <div>
          <h1>City services, guidance, and notices in one secure place.</h1>
          <p className="hero-copy">
            A simple workspace for residents and authorized officers to view local updates, manage account
            details, and access sustainability guidance from the city.
          </p>
        </div>

        <div className="hero-metrics">
          <div className="mini-stat">
            <div className="mini-stat-header">
              <span className="icon-chip">
                <AppIcon name="shield" />
              </span>
            </div>
            <strong>Secure access</strong>
            <span>Sign in to citizen services and authorized administration tools.</span>
          </div>
          <div className="mini-stat">
            <div className="mini-stat-header">
              <span className="icon-chip">
                <AppIcon name="leaf" />
              </span>
            </div>
            <strong>Personal guidance</strong>
            <span>Review practical household recommendations in plain language.</span>
          </div>
          <div className="mini-stat">
            <div className="mini-stat-header">
              <span className="icon-chip">
                <AppIcon name="notice" />
              </span>
            </div>
            <strong>Official notices</strong>
            <span>Stay informed about local programs, services, and public updates.</span>
          </div>
        </div>

        <div className="auth-hero-footer">© 2026 Sustainable City Services · Local Government Digital Team</div>
      </section>

      <section className="auth-form-side">
        <div className="auth-card">
          <div className="auth-toggle">
            <button
              className={mode === "login" ? "active" : ""}
              type="button"
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
            <button
              className={mode === "register" ? "active" : ""}
              type="button"
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>

          <div className="auth-header">
            <h2>{title}</h2>
            <p>
              {mode === "login"
                ? "Sign in with your registered email address to continue."
                : "Create an account to receive personalized guidance and sustainable living updates."}
            </p>
          </div>

          {error ? <div className="alert error" role="alert">{error}</div> : null}

          {mode === "login" ? (
            <form className="stacked-form" onSubmit={handleLogin}>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="your@email.com"
                  required
                />
              </label>

              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Enter your password"
                  required
                />
              </label>

              <button className="primary-button" disabled={busy} type="submit">
                {busy ? "Signing in..." : "Sign in"}
              </button>
            </form>
          ) : (
            <form className="stacked-form" onSubmit={handleRegister}>
              <div className="two-column-grid">
                <label className="field">
                  <span>Full Name</span>
                  <input
                    type="text"
                    autoComplete="name"
                    value={registerForm.full_name}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, full_name: event.target.value }))
                    }
                    required
                  />
                </label>

                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={registerForm.email}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, email: event.target.value }))
                    }
                    required
                  />
                </label>

                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={registerForm.password}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, password: event.target.value }))
                    }
                    required
                  />
                </label>

                <label className="field">
                  <span>Age</span>
                  <input
                    type="number"
                    min={1}
                    value={registerForm.age ?? ""}
                    onChange={(event) =>
                      setRegisterForm((current) => ({
                        ...current,
                        age: event.target.value ? Number(event.target.value) : undefined,
                      }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Gender</span>
                  <input
                    type="text"
                    value={registerForm.gender ?? ""}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, gender: event.target.value }))
                    }
                    placeholder="Female, Male, Other"
                  />
                </label>

                <label className="field">
                  <span>City</span>
                  <input
                    type="text"
                    autoComplete="address-level2"
                    value={registerForm.city ?? ""}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, city: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Phone</span>
                  <input
                    type="text"
                    autoComplete="tel"
                    value={registerForm.phone ?? ""}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, phone: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Address</span>
                  <input
                    type="text"
                    autoComplete="street-address"
                    value={registerForm.address ?? ""}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, address: event.target.value }))
                    }
                  />
                </label>
              </div>

              <button className="primary-button" disabled={busy} type="submit">
                {busy ? "Creating account..." : "Create secure account"}
              </button>
            </form>
          )}

          <div className="auth-footer">
            Need help accessing this service? Contact your local authority support desk for assistance.
          </div>
        </div>
      </section>
    </main>
  );
}
