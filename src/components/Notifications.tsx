import type { KeyboardEvent, ReactNode } from "react";
import { handle, useUsers } from "../context/UsersContext";
import type { AppNotification, Friend } from "../types";

// A row on the page: one notification, or all the likes on one hike grouped together
type Row = { key: string; items: AppNotification[]; latest: AppNotification; unread: boolean };

const DAY = 24 * 60 * 60 * 1000;

function groupRows(notifications: AppNotification[]): Row[] {
  const rows: Row[] = [];
  const likesByHike = new Map<string, Row>();
  for (const item of notifications) { // newest first
    if (item.type === "like" && item.logId) {
      const existing = likesByHike.get(item.logId);
      if (existing) {
        existing.items.push(item);
        existing.unread ||= !item.read;
        continue;
      }
      const row = { key: `likes-${item.logId}`, items: [item], latest: item, unread: !item.read };
      likesByHike.set(item.logId, row);
      rows.push(row);
      continue;
    }
    rows.push({ key: item.id, items: [item], latest: item, unread: !item.read });
  }
  return rows;
}

function sectionOf(createdAt: string, now: Date): "Today" | "This week" | "Earlier" {
  const date = new Date(createdAt);
  if (date.toDateString() === now.toDateString()) return "Today";
  return now.getTime() - date.getTime() < 7 * DAY ? "This week" : "Earlier";
}

// "now", "2m", "3h", "2d", "5w"
function timeAgo(createdAt: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 7 * 24 * 60) return `${Math.floor(minutes / (24 * 60))}d`;
  return `${Math.floor(minutes / (7 * 24 * 60))}w`;
}

function Avatar({ person }: { person: Friend }) {
  return (
    <span className="notif-avatar" style={{ background: person.color }}>
      {person.avatar ? <img alt="" src={person.avatar} /> : person.name.charAt(0).toUpperCase()}
    </span>
  );
}

export default function Notifications({
  notifications,
  loadError,
  following,
  onToggleFollow,
  onOpenProfile,
  onOpenPost,
}: {
  notifications: AppNotification[] | null; // newest first; null while loading
  loadError: string;
  following: string[];
  onToggleFollow: (person: Friend) => void;
  onOpenProfile: (id: string) => void;
  onOpenPost: (logId: string, commentId?: string) => void;
}) {
  const { getUser } = useUsers();
  const now = new Date();
  const rows = groupRows(notifications ?? []);
  const sections = (["Today", "This week", "Earlier"] as const)
    .map((title) => ({ title, rows: rows.filter((row) => sectionOf(row.latest.createdAt, now) === title) }))
    .filter((section) => section.rows.length > 0);

  // @username (or name) that opens the person's profile, without also opening the post
  const personLink = (person: Friend) => (
    <button
      className="profile-link notif-person"
      onClick={(event) => { event.stopPropagation(); onOpenProfile(person.id); }}
      type="button"
    >
      {handle(person) || person.name}
    </button>
  );

  const describe = (row: Row): ReactNode => {
    const item = row.latest;
    const actor = getUser(item.actorId);
    const trail = item.trailName ? <> at <b>{item.trailName}</b></> : null;
    if (item.type === "follow") return <>{personLink(actor)} started following you</>;
    if (item.type === "comment") {
      const text = item.commentText ?? "";
      return <>{personLink(actor)} commented: “{text.length > 60 ? `${text.slice(0, 60).trimEnd()}…` : text}”</>;
    }
    if (item.type === "tag") return <>{personLink(actor)} tagged you in a hike{trail}</>;
    if (item.type === "reply") return <>{personLink(actor)} replied to your comment</>;
    // Likes, grouped: "@kaylee liked", "@kaylee and @sam liked", "@kaylee and 3 others liked"
    const others = row.items.length - 1;
    const second = getUser(row.items[1]?.actorId ?? "");
    return (
      <>
        {personLink(actor)}
        {others === 1 && <> and {personLink(second)}</>}
        {others > 1 && <> and {others} others</>}
        {" "}liked your hike{trail}
      </>
    );
  };

  const open = (row: Row) => {
    const item = row.latest;
    if (item.type === "follow" || !item.logId) onOpenProfile(item.actorId);
    else onOpenPost(item.logId, item.type === "comment" || item.type === "reply" ? item.commentId ?? undefined : undefined);
  };

  return (
    <section className="screen-content notifications-screen">
      <h1 className="notifications-title">Notifications</h1>
      {loadError && <p className="trail-search-note" role="alert">Couldn't load notifications: {loadError}</p>}
      {!loadError && notifications === null && <p className="trail-search-note">Loading…</p>}
      {notifications !== null && rows.length === 0 && !loadError && (
        <div className="profile-empty notifications-empty">
          <img alt="" className="profile-empty-cashew" src="/assets/cashew-11-sleepy.svg" />
          <h2>No activity yet</h2>
          <p>Log a hike and tag your friends to get things going!</p>
        </div>
      )}
      {sections.map((section) => (
        <section aria-label={section.title} className="notif-section" key={section.title}>
          <h2>{section.title}</h2>
          {section.rows.map((row) => {
            const item = row.latest;
            const actor = getUser(item.actorId);
            const isFollowing = following.includes(item.actorId);
            return (
              <div
                className={`notif-row ${row.unread ? "unread" : ""}`}
                key={row.key}
                onClick={() => open(row)}
                onKeyDown={(event: KeyboardEvent) => { if (event.key === "Enter") open(row); }}
                role="link"
                tabIndex={0}
              >
                <button
                  aria-label={`View ${actor.name}'s profile`}
                  className={`profile-link notif-avatars ${row.items.length > 1 ? "stacked" : ""}`}
                  onClick={(event) => { event.stopPropagation(); onOpenProfile(actor.id); }}
                  type="button"
                >
                  {row.items.slice(0, 2).map((like) => <Avatar key={like.id} person={getUser(like.actorId)} />)}
                </button>
                <p className="notif-text">
                  {describe(row)} <time dateTime={item.createdAt}>{timeAgo(item.createdAt, now)}</time>
                </p>
                {item.type === "follow" ? (
                  <button
                    aria-pressed={isFollowing}
                    className={`notif-follow ${isFollowing ? "following" : ""}`}
                    onClick={(event) => { event.stopPropagation(); onToggleFollow(actor); }}
                    type="button"
                  >
                    {isFollowing ? "Following" : "Follow back"}
                  </button>
                ) : item.thumbnail ? (
                  item.thumbnail.type === "video" ? (
                    <video className="notif-thumb" muted playsInline preload="metadata" src={`${item.thumbnail.url}#t=0.1`} />
                  ) : (
                    <img alt="" className="notif-thumb" src={item.thumbnail.url} />
                  )
                ) : null}
              </div>
            );
          })}
        </section>
      ))}
    </section>
  );
}
