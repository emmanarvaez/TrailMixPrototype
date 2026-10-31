import { useState, type FormEvent } from "react";
import UsernameField, { useUsernameCheck } from "./UsernameField";
import { setUsername } from "../lib/db";

// One-time screen for accounts made before usernames existed; shown before anything else
export default function PickUsername({
  userId,
  name,
  onPicked,
}: {
  userId: string;
  name: string;
  onPicked: (username: string) => void;
}) {
  const [username, setValue] = useState("");
  const status = useUsernameCheck(username);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status !== "available") {
      setError(status === "checking" ? "Still checking that username. One sec!" : "Pick an available username.");
      return;
    }
    setSaving(true);
    try {
      await setUsername(userId, username);
      onPicked(username);
    } catch (saveError) {
      setError((saveError as { message?: string })?.message ?? "Couldn't save that. Try again?");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="auth-screen">
      <section aria-labelledby="pick-username-title" className="auth-panel">
        <div className="auth-brand">
          <span aria-hidden="true" className="wordmark-mark"><span /></span>
          <span>TrailMix</span>
        </div>
        <img alt="" className="pick-username-cashew" src="/assets/cashew-01-default.svg" />
        <span className="eyebrow">One quick thing</span>
        <h1 id="pick-username-title">Pick your username</h1>
        <p className="auth-intro">
          Hi {name.split(" ")[0]}! Friends will find and tag you by your username.
        </p>
        <form className="auth-form" noValidate onSubmit={submit}>
          <UsernameField autoFocus onChange={(next) => { setValue(next); setError(""); }} status={status} value={username} />
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="primary-button auth-submit" disabled={saving} type="submit">
            {saving ? "Saving…" : "Continue"}
          </button>
        </form>
      </section>
    </main>
  );
}
