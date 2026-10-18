import { useState, type FormEvent } from "react";

export type AuthUser = {
  name: string;
  email: string;
};

export default function Authpage({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");

  const isSignUp = mode === "signup";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (isSignUp && !name.trim()) {
      setError("Add your name to create an account.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (isSignUp && password !== confirmation) {
      setError("Those passwords don't match yet.");
      return;
    }

    const fallbackName = normalizedEmail.split("@")[0].replace(/[._-]+/g, " ");
    const displayName = (isSignUp ? name : fallbackName).trim();
    onAuthenticated({
      name: displayName.replace(/\b\w/g, (letter) => letter.toUpperCase()),
      email: normalizedEmail,
    });
  };

  const changeMode = () => {
    setMode(isSignUp ? "signin" : "signup");
    setError("");
  };

  return (
    <main className="auth-screen">
      <section aria-labelledby="auth-title" className="auth-panel">
        <div className="auth-brand">
          <span aria-hidden="true" className="wordmark-mark"><span /></span>
          <span>TrailMix</span>
        </div>
        <span className="eyebrow">Your next trail starts here</span>
        <h1 id="auth-title">{isSignUp ? "Join your trail crew" : "Good to have you back"}</h1>
        <p className="auth-intro">
          {isSignUp ? "Make an account and start sharing the miles." : "Sign in to catch up on the hikes you love."}
        </p>

        <div aria-label="Account access" className="auth-mode" role="group">
          <button aria-pressed={!isSignUp} className={!isSignUp ? "selected" : ""} onClick={() => { setMode("signin"); setError(""); }} type="button">
            Sign In
          </button>
          <button aria-pressed={isSignUp} className={isSignUp ? "selected" : ""} onClick={() => { setMode("signup"); setError(""); }} type="button">
            Sign Up
          </button>
        </div>

        <form className="auth-form" noValidate onSubmit={submit}>
          {isSignUp && (
            <label className="auth-field">
              <span>Your name</span>
              <input autoComplete="name" onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" required value={name} />
            </label>
          )}
          <label className="auth-field">
            <span>Email address</span>
            <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required type="email" value={email} />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input autoComplete={isSignUp ? "new-password" : "current-password"} minLength={8} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required type="password" value={password} />
          </label>
          {isSignUp && (
            <label className="auth-field">
              <span>Confirm password</span>
              <input autoComplete="new-password" onChange={(event) => setConfirmation(event.target.value)} placeholder="Enter your password again" required type="password" value={confirmation} />
            </label>
          )}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="primary-button auth-submit" type="submit">{isSignUp ? "Create account" : "Sign in"}</button>
        </form>

        <p className="auth-switch">
          {isSignUp ? "Already part of the crew?" : "New to TrailMix?"}{" "}
          <button onClick={changeMode} type="button">{isSignUp ? "Sign in" : "Create an account"}</button>
        </p>
      </section>
    </main>
  );
}