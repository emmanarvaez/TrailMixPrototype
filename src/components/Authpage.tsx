import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { fetchMyProfile } from "@/lib/db";
import UsernameField, { useUsernameCheck } from "./UsernameField";

export type AuthUser = {
  id: string;
  name: string;
  username?: string; // missing for accounts made before usernames; they pick one on sign-in
  email: string; // only ever shown to the user themselves
  phone?: string;
  avatar?: string;
};

export default function Authpage({
  onAuthenticated,
}: {
  onAuthenticated: (user: AuthUser, options?: { isNewAccount?: boolean }) => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const usernameStatus = useUsernameCheck(username);
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
      setError("Add your name to create an account.");
      return;
    }
    if (isSignUp && usernameStatus !== "available") {
      setError(
        usernameStatus === "taken" ? "That username is taken. Try another."
          : usernameStatus === "checking" ? "Still checking that username. One sec!"
          : "Pick a username to create an account.",
      );
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
          // The profile (with this username) is created by the handle_new_user trigger
          options: { data: { name: displayName, username } },
        });
        if (signUpError) {
          // The trigger fails if someone grabbed the username between the check and now
          setError(/database error/i.test(signUpError.message) ? "That username was just taken. Try another." : signUpError.message);
          return;
        }
        const authUser = data.user;
        if (!authUser) { setError("Sign-up failed. Please try again."); return; }

        onAuthenticated({ id: authUser.id, name: displayName, username, email: normalizedEmail }, { isNewAccount: true });
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) { setError(signInError.message); return; }
        const authUser = data.user;
        if (!authUser) { setError("Sign-in failed. Please try again."); return; }

        // Name, username, photo and phone from the user's own profile
        const profile = await fetchMyProfile().catch((profileError) => {
          console.error("Couldn't load profile", profileError);
          return null;
        });

        const fallbackName = normalizedEmail.split("@")[0].replace(/[._-]+/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
        onAuthenticated({
          id: authUser.id,
          name: profile?.name ?? fallbackName,
          username: profile?.username ?? undefined,
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
              <span>Your name</span>
              <input autoComplete="name" onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" required value={name} />
            </label>
          )}
          {isSignUp && <UsernameField onChange={setUsername} status={usernameStatus} value={username} />}
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
