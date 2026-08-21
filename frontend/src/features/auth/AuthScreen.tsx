import { useMemo, useState, type FormEvent } from "react";

import { useAuth } from "../../auth/AuthContext";
import { AppIcon } from "../../components/AppIcon";
import { SearchableSelect } from "../../components/SearchableSelect";
import { useCities } from "../../hooks/useCities";
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
  const [cityTouched, setCityTouched] = useState(false);
  const { cities, country, loading: citiesLoading, error: citiesError } = useCities();

  const title = useMemo(
    () => (mode === "login" ? "Access your account" : "Create your account"),
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

    // The combobox is not a native control, so required-ness is enforced here
    // rather than by the browser. The API validates the value again server-side.
    if (!registerForm.city) {
      setCityTouched(true);
      setError("Select your city to continue.");
      return;
    }

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
          <div>
            <div className="eyebrow" style={{ marginBottom: 0 }}>Sustainable City Services</div>
            <div className="brand-name">CivicGreen</div>
          </div>
        </div>

        <div>
          <h1>City services, guidance, and notices — in one place.</h1>
          <p className="hero-copy">
            A single workspace for residents and city officers: household sustainability guidance, live
            notices, and citywide planning data.
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
            <span>Role-based sign-in for citizens and officers.</span>
          </div>
          <div className="mini-stat">
            <div className="mini-stat-header">
              <span className="icon-chip">
                <AppIcon name="leaf" />
              </span>
            </div>
            <strong>Personal guidance</strong>
            <span>Plain-language household impact estimates.</span>
          </div>
          <div className="mini-stat">
            <div className="mini-stat-header">
              <span className="icon-chip">
                <AppIcon name="notice" />
              </span>
            </div>
            <strong>Official notices</strong>
            <span>Stay current on programs and service updates.</span>
          </div>
        </div>

        <div className="auth-hero-footer">© 2026 CivicGreen · Local Government Digital Services</div>
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
                ? "Sign in with your registered email to continue."
                : "Register as a citizen to receive personalized sustainability guidance."}
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

                <div className="field">
                  <span>City</span>
                  <SearchableSelect
                    disabled={citiesLoading || Boolean(citiesError)}
                    emptyMessage="No city matches that search."
                    invalid={cityTouched && !registerForm.city}
                    onChange={(value) => {
                      setCityTouched(true);
                      setRegisterForm((current) => ({ ...current, city: value }));
                    }}
                    options={cities}
                    placeholder={
                      citiesLoading
                        ? "Loading cities..."
                        : citiesError
                          ? "City list unavailable"
                          : `Search ${country || "your"} cities`
                    }
                    value={registerForm.city}
                  />
                  <small className="field-hint">
                    {citiesError
                      ? "The city list could not be loaded. Refresh the page and try again."
                      : "Required. Your city determines which local notices you receive."}
                  </small>
                </div>

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
