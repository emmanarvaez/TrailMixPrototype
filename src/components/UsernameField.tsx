import { useEffect, useState } from "react";
import { USERNAME_RULES, usernameAvailable, usernameProblem } from "../lib/db";

export type UsernameStatus = "idle" | "unchanged" | "invalid" | "checking" | "available" | "taken" | "error";

// Checks a username as it's typed: format first, then (after a short pause) whether it's taken.
// `current` is the user's existing username, which counts as fine to keep.
export function useUsernameCheck(username: string, current?: string): UsernameStatus {
  const [status, setStatus] = useState<UsernameStatus>("idle");
  useEffect(() => {
    if (!username) return setStatus("idle");
    if (current && username === current) return setStatus("unchanged");
    if (usernameProblem(username)) return setStatus("invalid");
    setStatus("checking");
    let cancelled = false;
    const timer = window.setTimeout(() => {
      usernameAvailable(username)
        .then((free) => { if (!cancelled) setStatus(free ? "available" : "taken"); })
        .catch(() => { if (!cancelled) setStatus("error"); });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [username, current]);
  return status;
}

export default function UsernameField({
  value,
  onChange,
  status,
  label = "Username",
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  status: UsernameStatus;
  label?: string;
  autoFocus?: boolean;
}) {
  const message: Record<UsernameStatus, string> = {
    idle: USERNAME_RULES,
    unchanged: "This is your current username.",
    invalid: usernameProblem(value) ?? "",
    checking: "Checking…",
    available: `@${value} is available`,
    taken: `@${value} is taken`,
    error: "Couldn't check that username right now.",
  };
  return (
    <label className="auth-field username-field">
      <span>{label}</span>
      <span className="username-input">
        <span aria-hidden="true">@</span>
        <input
          aria-describedby="username-status"
          autoCapitalize="none"
          autoComplete="username"
          autoCorrect="off"
          autoFocus={autoFocus}
          maxLength={20}
          // Usernames are lowercase, so type in any case and it's lowered as you go
          onChange={(event) => onChange(event.target.value.toLowerCase().replace(/\s/g, ""))}
          placeholder="trail_runner"
          spellCheck={false}
          value={value}
        />
      </span>
      <small aria-live="polite" className={`username-status ${status}`} id="username-status">
        {status === "available" && "✓ "}{message[status]}
      </small>
    </label>
  );
}
