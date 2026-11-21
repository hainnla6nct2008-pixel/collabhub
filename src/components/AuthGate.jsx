
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import useUserRole from "../hooks/useUserRole";

function AuthGate({ children }) {
  const { role, loadingRole, roleError } = useUserRole();

  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;

        setUser(session?.user ?? null);
        setChecking(false);
      }
    );

    async function checkUser() {
      const { data, error } =
        await supabase.auth.getUser();

      if (!active) return;

      if (error) {
        console.warn("Auth check:", error.message);
      }

      setUser(data?.user ?? null);
      setChecking(false);
    }

    checkUser();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (loading) return;

    setError("");
    setMessage("");

    if (mode === "signup") {
      if (password.length < 8) {
        setError(
          "Password must contain at least 8 characters."
        );
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const { error } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password
          });

        if (error) throw error;

      } else {
        const redirectUrl = new URL(
          import.meta.env.BASE_URL,
          window.location.origin
        ).href;

        const { data, error } =
          await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: redirectUrl
            }
          });

        if (error) throw error;

        setPassword("");
        setConfirmPassword("");

        if (data.session) {
          setMessage(
            "Account created successfully."
          );
        } else {
          setMessage(
            "Please check your email to confirm " +
            "your account, then return and sign in."
          );
        }
      }
    } catch (err) {
      setError(
        err?.message || "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    if (loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) throw error;

      setUser(null);
      setPassword("");
      setConfirmPassword("");
      setMode("login");
    } catch (err) {
      setError(
        err?.message || "Unable to log out."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="auth-loading">
        Checking session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-page">
        <form
          className="auth-card"
          onSubmit={handleSubmit}
        >
          <h1>CollabHub</h1>

          <h2>
            {mode === "login"
              ? "Welcome Back"
              : "Create Account"}
          </h2>

          <p>
            {mode === "login"
              ? "Sign in to your learning workspace"
              : "Join the CollabHub learning community"}
          </p>

          <div className="auth-tabs">
            <button
              type="button"
              className={
                mode === "login" ? "active" : ""
              }
              onClick={() => switchMode("login")}
              disabled={loading}
            >
              Sign In
            </button>

            <button
              type="button"
              className={
                mode === "signup" ? "active" : ""
              }
              onClick={() => switchMode("signup")}
              disabled={loading}
            >
              Create Account
            </button>
          </div>

          <label htmlFor="auth-email">
            Email Address
          </label>

          <input
            id="auth-email"
            type="email"
            placeholder="student@example.com"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            autoComplete="email"
            required
          />

          <label htmlFor="auth-password">
            Password
          </label>

          <input
            id="auth-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            autoComplete={
              mode === "login"
                ? "current-password"
                : "new-password"
            }
            minLength={
              mode === "signup" ? 8 : undefined
            }
            required
          />

          {mode === "signup" && (
            <>
              <label htmlFor="auth-confirm">
                Confirm Password
              </label>

              <input
                id="auth-confirm"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                autoComplete="new-password"
                minLength={8}
                required
              />
            </>
          )}

          {error && (
            <p
              className="auth-error"
              role="alert"
            >
              {error}
            </p>
          )}

          {message && (
            <p
              className="auth-success"
              role="status"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </button>

          <p className="auth-switch">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}

            {" "}

            <button
              type="button"
              onClick={() =>
                switchMode(
                  mode === "login"
                    ? "signup"
                    : "login"
                )
              }
              disabled={loading}
            >
              {mode === "login"
                ? "Sign Up"
                : "Sign In"}
            </button>
          </p>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="auth-topbar">
        <div className="auth-user-info">
          <span>{user.email}</span>

          <strong className="auth-role">
            {loadingRole
              ? "(Checking role...)"
              : role === "admin"
                ? "(Admin)"
                : role === "student"
                  ? "(Student)"
                  : "(No role)"}
          </strong>
        </div>

        {roleError && (
          <span
            role="alert"
            className="auth-error"
          >
            Could not load account role:
            {" "}
            {roleError}
          </span>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="auth-logout"
          disabled={loading}
        >
          {loading
            ? "Processing..."
            : "Log Out"}
        </button>

        {error && (
          <span
            role="alert"
            className="auth-error"
          >
            {error}
          </span>
        )}
      </div>

      {children}
    </>
  );
}

export default AuthGate;
