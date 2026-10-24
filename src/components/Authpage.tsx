import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
};

export default function Authpage({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignUp = mode === "signup";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const normalizedEmail = email.trim();

    if (isSignUp && !name.trim()) {
      setError("Enter a username to create an account.");
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

    setLoading(true);
    try {
      if (isSignUp) {
        const displayName = name.trim().replace(/\b\w/g, (l) => l.toUpperCase());
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { name: displayName } },
        });
        if (signUpError) { setError(signUpError.message); return; }
        const authUser = data.user;
        if (!authUser) { setError("Sign-up failed. Please try again."); return; }

        // Insert profile row (also handled by the DB trigger, this is a fallback)
        await supabase.from("profiles").upsert({
          id: authUser.id,
          name: displayName,
          email: normalizedEmail,
        });

        onAuthenticated({ id: authUser.id, name: displayName, email: normalizedEmail });
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) { setError(signInError.message); return; }
        const authUser = data.user;
        if (!authUser) { setError("Sign-in failed. Please try again."); return; }

        // Fetch display name from profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, phone, avatar_url")
          .eq("id", authUser.id)
          .single();

        const fallbackName = normalizedEmail.split("@")[0].replace(/[._-]+/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
        onAuthenticated({
          id: authUser.id,
          name: profile?.name ?? fallbackName,
          email: normalizedEmail,
          phone: profile?.phone ?? undefined,
          avatar: profile?.avatar_url ?? undefined,
        });
      }
    } finally {
      setLoading(false);
    }
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
              <span>Username</span>
              <input autoComplete="name" onChange={(event) => setName(event.target.value)} placeholder="Enter your username" required value={name} />
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
          <button className="primary-button auth-submit" disabled={loading} type="submit">
            {loading ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          {isSignUp ? "Already part of the crew?" : "New to TrailMix?"}{" "}
          <button onClick={changeMode} type="button">{isSignUp ? "Sign in" : "Create an account"}</button>
        </p>
      </section>
    </main>
  );
}
