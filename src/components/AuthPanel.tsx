
import { useState } from "react";
import { supabase } from "../lib/supabase";

type AuthPanelProps = {
  onDone?: () => void;
};

export default function AuthPanel({ onDone }: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();

    if (mode === "register" && !normalizedName) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "register") {
        const { data, error: signUpError } =
          await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              data: {
                full_name: normalizedName,
              },
            },
          });

        if (signUpError) {
          throw signUpError;
        }

        if (data.session) {
          setMessage("Your account has been created successfully.");
          setPassword("");
          onDone?.();
        } else {
          setMessage(
            "Registration submitted! Check your email for a confirmation link before signing in."
          );
          setMode("login");
          setPassword("");
          setShowPassword(false);
        }
      } else {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

        if (signInError) {
          throw signInError;
        }

        setMessage("Login successful.");
        setPassword("");
        onDone?.();
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setMode((current) => (current === "login" ? "register" : "login"));
    setError("");
    setMessage("");
    setPassword("");
    setShowPassword(false);
  }

  return (
    <section className="section page-section">
      <div className="admin-login">
        <span className="eyebrow">TEAM DESALSAL</span>

        <h1>
          {mode === "login" ? "Welcome Back!" : "Create Your Account"}
        </h1>

        <p>
          {mode === "login"
            ? "Sign in to your Team Desalsal account."
            : "Create an account to get started with Team Desalsal."}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <label htmlFor="auth-full-name">Full Name</label>
              <input
                id="auth-full-name"
                name="fullName"
                type="text"
                autoComplete="name"
                maxLength={100}
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter your full name"
                disabled={loading}
              />
            </>
          )}

          <label htmlFor="auth-email">Email Address</label>
          <input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            disabled={loading}
          />

          <label htmlFor="auth-password">Password</label>

          <div className="password-input-wrap">
            <input
              id="auth-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={
                mode === "login"
                  ? "Enter your password"
                  : "At least 8 characters"
              }
              disabled={loading}
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowPassword((previous) => !previous)
              }
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              title={showPassword ? "Hide password" : "Show password"}
              disabled={loading}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {error && (
            <p className="form-warning" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="success-message" role="status">
              {message}
            </p>
          )}

          <button
            className="button button-primary full-width"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        <p className="small-note">
          {mode === "login"
            ? "New to Team Desalsal?"
            : "Already have an account?"}{" "}

          <button
            type="button"
            className="text-button"
            disabled={loading}
            onClick={toggleMode}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </section>
  );
}
