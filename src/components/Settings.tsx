import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { AuthUser } from "./Authpage";

type Field = "email" | "phone" | "password";

const fieldLabels: Record<Field, string> = {
  email: "Change Email Address",
  phone: "Change Phone Number",
  password: "Change Password",
};

export default function Settings({
  user,
  onUpdateUser,
}: {
  user: AuthUser;
  onUpdateUser: (changes: Partial<AuthUser>) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<Field | null>(null);
  const [value, setValue] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Field | "photo" | null>(null);

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

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = value.trim();
    if (editing === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) return setError("Enter a valid email address.");
      onUpdateUser({ email: next });
    } else if (editing === "phone") {
      if (next.replace(/\D/g, "").length < 10) return setError("Enter a phone number with at least 10 digits.");
      onUpdateUser({ phone: next });
    } else if (editing === "password") {
      if (value.length < 8) return setError("Use a password with at least 8 characters.");
      if (value !== confirmation) return setError("Those passwords don't match yet.");
      // Mock only: no backend yet, so the new password isn't stored anywhere.
    }
    setSaved(editing);
    setEditing(null);
  };

  const changePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUpdateUser({ avatar: reader.result as string });
      setSaved("photo");
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="screen-content settings-screen">
      <h1 className="settings-title">Settings</h1>

      <div className="settings-photo">
        <span className="settings-avatar">
          {user.avatar ? <img alt="Your profile picture" src={user.avatar} /> : user.name.charAt(0).toUpperCase()}
        </span>
        <button className="settings-photo-button" onClick={() => fileInput.current?.click()} type="button">
          Change Profile Picture
        </button>
        <input accept="image/*" className="visually-hidden" onChange={changePhoto} ref={fileInput} tabIndex={-1} type="file" />
        {saved === "photo" && <p className="settings-saved">Profile picture updated</p>}
      </div>

      <div className="settings-list">
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
                  <button className="settings-save" type="submit">Save</button>
                </div>
              </form>
            ) : (
              <button className="settings-bar" onClick={() => startEditing(field)} type="button">
                <span className="settings-current">{currentValues[field]}</span>
                <span aria-hidden="true" className="settings-chevron">›</span>
              </button>
            )}
            {saved === field && <p className="settings-saved">{field === "password" ? "Password updated" : "Saved"}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
