import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { AuthUser } from "./Authpage";
import { BIO_MAX_LENGTH, colorFor, saveBio, setUsername, updateProfile, uploadAvatar } from "../lib/db";
import { supabase } from "../lib/supabase";
import UsernameField, { useUsernameCheck } from "./UsernameField";

type Field = "email" | "name" | "password";

const fieldLabels: Record<Field, string> = {
  email: "Change Email Address",
  name: "Change Name",
  password: "Change Password",
};

export default function Settings({
  user,
  onUpdateUser,
  onSignOut,
  onReplayTips,
}: {
  user: AuthUser;
  onUpdateUser: (changes: Partial<AuthUser>) => void;
  onSignOut: () => void;
  onReplayTips: () => Promise<void>; // Cashew's Log a Hike tips show again
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<Field | null>(null);
  const [value, setValue] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Field | "photo" | "username" | "tips" | "bio" | null>(null);
  const [tipsError, setTipsError] = useState("");
  const [replaying, setReplaying] = useState(false);

  const replayTips = () => {
    setReplaying(true);
    setTipsError("");
    onReplayTips()
      .then(() => setSaved("tips"))
      .catch((replayError) => {
        console.error("Couldn't reset tips", replayError);
        setTipsError("Couldn't reset your tips. Try again?");
      })
      .finally(() => setReplaying(false));
  };
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const usernameStatus = useUsernameCheck(newUsername, user.username);
  const [savedMessage, setSavedMessage] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState("");
  const [bioError, setBioError] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const currentValues: Record<Field, string> = {
    email: user.email,
    name: user.name,
    // The real password is never shown; it's always displayed masked.
    password: "••••••••••",
  };

  const startEditing = (field: Field) => {
    setEditing(field);
    setValue(field === "password" ? "" : field === "name" ? user.name : user.email);
    setConfirmation("");
    setError("");
    setSaved(null);
  };

  const cancel = () => {
    setEditing(null);
    setError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = value.trim();
    if (editing === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) return setError("Enter a valid email address.");
    if (editing === "name" && !next) return setError("Enter a name to continue.");
    if (editing === "password") {
      if (value.length < 8) return setError("Use a password with at least 8 characters.");
      if (value !== confirmation) return setError("Those passwords don't match yet.");
    }
    setSaving(true);
    try {
      if (editing === "email") {
        // Supabase emails a confirmation link; the address only changes once it's clicked
        const { error: emailError } = await supabase.auth.updateUser({ email: next });
        if (emailError) throw emailError;
        setSavedMessage(`Check ${next} to confirm the change`);
      } else if (editing === "name") {
        await updateProfile(user.id, { name: next });
        onUpdateUser({ name: next });
        setSavedMessage("Saved");
      } else if (editing === "password") {
        const { error: passwordError } = await supabase.auth.updateUser({ password: value });
        if (passwordError) throw passwordError;
        setSavedMessage("Password updated");
      }
      setSaved(editing);
      setEditing(null);
    } catch (saveError) {
      setError((saveError as { message?: string })?.message ?? "Couldn't save that. Try again?");
    } finally {
      setSaving(false);
    }
  };

  const saveUsername = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (usernameStatus === "unchanged") return setEditingUsername(false);
    if (usernameStatus !== "available") {
      return setUsernameError(usernameStatus === "checking" ? "Still checking that username. One sec!" : "Pick an available username.");
    }
    setSaving(true);
    try {
      await setUsername(user.id, newUsername);
      onUpdateUser({ username: newUsername });
      setEditingUsername(false);
      setSaved("username");
    } catch (saveError) {
      setUsernameError((saveError as { message?: string })?.message ?? "Couldn't save that. Try again?");
    } finally {
      setSaving(false);
    }
  };

  // Saves the bio as typed; "" (or Remove bio) clears it
  const submitBio = async (next: string) => {
    setSaving(true);
    setBioError("");
    try {
      const savedBio = await saveBio(user.id, next);
      onUpdateUser({ bio: savedBio || undefined });
      setSavedMessage(savedBio ? "Bio saved" : "Bio removed");
      setSaved("bio");
      setEditingBio(false);
    } catch (saveError) {
      setBioError((saveError as { message?: string })?.message ?? "Couldn't save your bio. Try again?");
    } finally {
      setSaving(false);
    }
  };

  const changePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoError("");
    try {
      const url = await uploadAvatar(user.id, file);
      onUpdateUser({ avatar: url });
      setSaved("photo");
    } catch (uploadError) {
      setPhotoError((uploadError as { message?: string })?.message ?? "Couldn't upload that photo.");
    }
  };

  return (
    <section className="screen-content settings-screen">
      <h1 className="settings-title">Settings</h1>

      <div className="settings-photo">
        <span className="settings-avatar" style={{ background: colorFor(user.id) }}>
          {user.avatar ? <img alt="Your profile picture" src={user.avatar} /> : user.name.charAt(0).toUpperCase()}
        </span>
        <button className="settings-photo-button" onClick={() => fileInput.current?.click()} type="button">
          Change Profile Picture
        </button>
        <input accept="image/*" capture="environment" className="visually-hidden" onChange={changePhoto} ref={fileInput} tabIndex={-1} type="file" />
        {saved === "photo" && <p className="settings-saved">Profile picture updated</p>}
        {photoError && <p className="settings-error" role="alert">{photoError}</p>}
      </div>

      <div className="settings-list">
        <div className="settings-field">
          <span className="settings-label">Change Username</span>
          {editingUsername ? (
            <form className="settings-form" noValidate onSubmit={saveUsername}>
              <UsernameField autoFocus label="New username" onChange={(next) => { setNewUsername(next); setUsernameError(""); }} status={usernameStatus} value={newUsername} />
              {usernameError && <p className="settings-error" role="alert">{usernameError}</p>}
              <div className="settings-form-actions">
                <button className="settings-cancel" onClick={() => setEditingUsername(false)} type="button">Cancel</button>
                <button className="settings-save" disabled={saving} type="submit">{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          ) : (
            <button
              className="settings-bar"
              onClick={() => { setEditingUsername(true); setNewUsername(user.username ?? ""); setUsernameError(""); setSaved(null); }}
              type="button"
            >
              <span className="settings-current">{user.username ? `@${user.username}` : "No username yet"}</span>
              <span aria-hidden="true" className="settings-chevron">›</span>
            </button>
          )}
          {saved === "username" && <p className="settings-saved">Username updated</p>}
        </div>
        <div className="settings-field">
          <span className="settings-label">Edit Bio</span>
          {editingBio ? (
            <form className="settings-form" noValidate onSubmit={(event) => { event.preventDefault(); submitBio(bio); }}>
              <textarea
                aria-describedby="bio-count"
                aria-label="Bio"
                autoFocus
                className="settings-bio-input"
                maxLength={BIO_MAX_LENGTH}
                onChange={(event) => { setBio(event.target.value); setBioError(""); }}
                placeholder="Tell your trail crew a little about yourself"
                rows={3}
                value={bio}
              />
              <span className={`settings-bio-count ${BIO_MAX_LENGTH - bio.length <= 10 ? "low" : ""}`} id="bio-count">
                {BIO_MAX_LENGTH - bio.length} characters left
              </span>
              {bioError && <p className="settings-error" role="alert">{bioError}</p>}
              <div className="settings-form-actions">
                {user.bio && (
                  <button className="settings-cancel settings-remove" disabled={saving} onClick={() => submitBio("")} type="button">
                    Remove bio
                  </button>
                )}
                <button className="settings-cancel" onClick={() => setEditingBio(false)} type="button">Cancel</button>
                <button className="settings-save" disabled={saving} type="submit">{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          ) : (
            <button
              className="settings-bar"
              onClick={() => { setEditingBio(true); setBio(user.bio ?? ""); setBioError(""); setSaved(null); }}
              type="button"
            >
              <span className="settings-current">{user.bio || "No bio yet"}</span>
              <span aria-hidden="true" className="settings-chevron">›</span>
            </button>
          )}
          {saved === "bio" && <p className="settings-saved">{savedMessage}</p>}
        </div>
        {(Object.keys(fieldLabels) as Field[]).map((field) => (
          <div className="settings-field" key={field}>
            <span className="settings-label">{fieldLabels[field]}</span>
            {editing === field ? (
              <form className="settings-form" noValidate onSubmit={submit}>
                <input
                  aria-label={field === "password" ? "New password" : fieldLabels[field]}
                  autoComplete={field === "email" ? "email" : field === "name" ? "name" : "new-password"}
                  autoFocus
                  onChange={(event) => setValue(event.target.value)}
                  placeholder={field === "password" ? "New password" : field === "name" ? "Your name" : "you@example.com"}
                  type={field === "email" ? "email" : field === "password" ? "password" : "text"}
                  value={value}
                />
                {field === "password" && (
                  <input
                    aria-label="Confirm new password"
                    autoComplete="new-password"
                    onChange={(event) => setConfirmation(event.target.value)}
                    placeholder="Confirm new password"
                    type="password"
                    value={confirmation}
                  />
                )}
                {error && <p className="settings-error" role="alert">{error}</p>}
                <div className="settings-form-actions">
                  <button className="settings-cancel" onClick={cancel} type="button">Cancel</button>
                  <button className="settings-save" disabled={saving} type="submit">{saving ? "Saving…" : "Save"}</button>
                </div>
              </form>
            ) : (
              <button className="settings-bar" onClick={() => startEditing(field)} type="button">
                <span className="settings-current">{currentValues[field]}</span>
                <span aria-hidden="true" className="settings-chevron">›</span>
              </button>
            )}
            {saved === field && <p className="settings-saved">{savedMessage}</p>}
          </div>
        ))}
        <div className="settings-field">
          <span className="settings-label">Cashew's tips</span>
          <button className="settings-bar" disabled={replaying} onClick={replayTips} type="button">
            <span className="settings-current">{replaying ? "Resetting…" : "Replay tips"}</span>
            <span aria-hidden="true" className="settings-chevron">›</span>
          </button>
          {saved === "tips" && <p className="settings-saved">Cashew will show the Log a Hike tips again</p>}
          {tipsError && <p className="settings-error" role="alert">{tipsError}</p>}
        </div>
      </div>
      <button className="auth-signout settings-signout" onClick={onSignOut} type="button">Sign out</button>
    </section>
  );
}
