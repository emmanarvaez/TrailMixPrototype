import type { FriendAction, FriendStatus } from "../lib/db";

// The friendship button for one person, used on profiles, people lists and notifications:
//   none     → "Add Friend" (sends a request)
//   outgoing → "Request Sent" (tap to cancel)
//   incoming → "Accept" + "Decline"
//   friends  → "Friends" (tap to unfriend, after confirming)
export default function FriendButton({
  status,
  name,
  onAction,
  size = "row",
}: {
  status: FriendStatus;
  name: string; // for labels and the unfriend confirmation
  onAction: (action: FriendAction) => void;
  size?: "header" | "row";
}) {
  const base = size === "header" ? "profile-add-button" : "friend-row-button";

  if (status === "incoming") {
    return (
      <span className={`friend-request-actions ${size}`}>
        <button className={`${base} friend-accept`} onClick={(event) => { event.stopPropagation(); onAction("accept"); }} type="button">
          {size === "header" ? "Accept Request" : "Accept"}
        </button>
        <button
          aria-label={`Decline ${name}'s friend request`}
          className={`${base} friend-decline`}
          onClick={(event) => { event.stopPropagation(); onAction("decline"); }}
          type="button"
        >
          Decline
        </button>
      </span>
    );
  }

  const label = status === "friends" ? "Friends" : status === "outgoing" ? "Request Sent" : "Add Friend";
  const click = () => {
    if (status === "none") onAction("send");
    else if (status === "outgoing") onAction("cancel");
    else if (window.confirm(`Remove ${name} as a friend? You'll both lose access to each other's hikes.`)) onAction("remove");
  };

  return (
    <button
      aria-label={status === "outgoing" ? `Cancel friend request to ${name}` : status === "friends" ? `Friends with ${name}. Tap to remove` : `Add ${name} as a friend`}
      className={`${base} friend-${status}`}
      onClick={(event) => { event.stopPropagation(); click(); }}
      type="button"
    >
      {size === "header" && <span aria-hidden="true">{status === "friends" ? "✓" : status === "outgoing" ? "⋯" : "+"}</span>}
      <span>{label}</span>
    </button>
  );
}
