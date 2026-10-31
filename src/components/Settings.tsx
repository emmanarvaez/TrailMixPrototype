import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { AuthUser } from "./Authpage";
import { colorFor, setUsername, updateProfile, uploadAvatar } from "../lib/db";
import { supabase } from "../lib/supabase";
import UsernameField, { useUsernameCheck } from "./UsernameField";

type Field = "email" | "phone" | "password";

const fieldLabels: Record<Field, string> = {
  email: "Change Email Address",
  phone: "Change Phone Number",
  password: "Change Password",
};

export default function Settings({
  user,
  onUpdateUser,
  onSignOut,
}: {
  user: AuthUser;
  onUpdateUser: (changes: Partial<AuthUser>) => void;
  onSignOut: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<Field | null>(null);
  const [value, setValue] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Field | "photo" | "username" | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const usernameStatus = useUsernameCheck(newUsername, user.username);
  const [savedMessage, setSavedMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const currentValues: Record<Field, string> = {
    email: user.email,
    phone: user.phone || "No phone number added",
    // The real password is never shown; it's always displayed masked.
    password: "••••••••••",
  };

  const startEditing = (field: Field) => {
    setEditing(field);
    setValue(field === "password" ? "" : field === "phone" ? user.phone ?? "" : user.email);
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
    if (editing === "phone" && next.replace(/\D/g, "").length < 10) return setError("Enter a phone number with at least 10 digits.");
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
      } else if (editing === "phone") {
        await updateProfile(user.id, { phone: next });
        onUpdateUser({ phone: next });
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
        <input accept="image/*" className="visually-hidden" onChange={changePhoto} ref={fileInput} tabIndex={-1} type="file" />
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
        {(Object.keys(fieldLabels) as Field[]).map((field) => (
          <div className="settings-field" key={field}>
            <span className="settings-label">{fieldLabels[field]}</span>
            {editing === field ? (
              <form className="settings-form" noValidate onSubmit={submit}>
                <input
                  aria-label={field === "password" ? "New password" : fieldLabels[field]}
                  autoComplete={field === "email" ? "email" : field === "phone" ? "tel" : "new-password"}
                  autoFocus
                  onChange={(event) => setValue(event.target.value)}
                  placeholder={field === "password" ? "New password" : field === "phone" ? "(555) 123-4567" : "you@example.com"}
                  type={field === "email" ? "email" : field === "phone" ? "tel" : "password"}
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
      </div>
      <button className="auth-signout settings-signout" onClick={onSignOut} type="button">Sign out</button>
    </section>
  );
}
