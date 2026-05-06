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
      <section className="hero-card">
        <div className="eyebrow">Sustainable City Services</div>
        <h1>Support greener living through one trusted city service portal.</h1>
        <p className="hero-copy">
          Citizens and authorized officers can review official notices, manage account details, and use
          planning tools designed to reduce carbon impact, encourage smart habits, and build healthier
          communities.
        </p>

        <div className="hero-metrics">
          <div className="mini-stat">
            <div className="mini-stat-header">
              <span className="icon-chip">
                <AppIcon name="shield" />
              </span>
            </div>
            <strong style={{paddingTop: "50px"}}>Account access</strong>
            <br/>
            <span>Secure sign-in for citizen services and administrative functions</span>
          </div>
          <div className="mini-stat">
            <div className="mini-stat-header">
              <span className="icon-chip">
                <AppIcon name="leaf" />
              </span>
            </div>
            <strong style={{paddingTop: "50px"}}>Personal guidance</strong>
            <br/>
            <span>Household recommendations that support lower-carbon and energy-aware living</span>
          </div>
          <div className="mini-stat">
            <div className="mini-stat-header">
              <span className="icon-chip">
                <AppIcon name="notice" />
              </span>
            </div>
            <strong style={{paddingTop: "50px"}}>City sustainability updates</strong>
            <br/>
            <span style={{paddingTop: "50px"}}>Official updates that help residents take part in a cleaner, greener city</span>
          </div>
        </div>
      </section>

      <section className="auth-card">
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

        {error ? <div className="alert error">{error}</div> : null}

        {mode === "login" ? (
          <form className="stacked-form" onSubmit={handleLogin}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
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
      </section>
    </main>
  );
}
