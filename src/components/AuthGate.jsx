
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkUser() {
      const { data, error } = await supabase.auth.getUser();

      if (!active) return;

      if (error) {
        console.warn("Auth check:", error.message);
      }

      setUser(data.user ?? null);
      setChecking(false);
    }

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((event, session) => {
        if (!active) return;

        if (event === "SIGNED_IN") {
          setUser(session?.user ?? null);
          setChecking(false);
        }

        if (event === "SIGNED_OUT") {
          setUser(null);
          setChecking(false);
        }
      });

    checkUser();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      setError(error.message);
    }

    setLoading(false);
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut({
      scope: "local"
    });

    if (error) {
      setError(error.message);
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
        <form className="auth-card" onSubmit={handleLogin}>
          <h1>CollabHub</h1>
          <h2>Welcome Back</h2>
          <p>Sign in to your learning workspace</p>

          <label>Email Address</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="auth-topbar">
        <span>{user.email}</span>

        <button
          type="button"
          onClick={handleLogout}
          className="auth-logout"
        >
          Log Out
        </button>
      </div>

      {children}
    </>
  );
}

export default AuthGate;
