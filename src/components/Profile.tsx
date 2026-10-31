import { useMemo, useState } from "react";
import MountainScene from "./MountainScene";
import { friends, type FeedPost, type Friend } from "../data/feedPosts";

const suggestions: Friend[] = [
  { id: "mock-maya", name: "Maya Chen", username: "mayatreks", color: "#4b806b" },
  { id: "mock-luca", name: "Luca Rivera", username: "lucarambles", color: "#b75d3d" },
  { id: "mock-nina", name: "Nina Brooks", username: "ninabrooks", color: "#71819a" },
];

type ProfileTab = "posts" | "mountain" | "saved" | "tagged" | "friends";

// Saved hikes are private, so they only appear on your own profile. The friends list
// isn't a tab: it opens from the Friends count under your profile picture.
const OWN_TABS: ProfileTab[] = ["posts", "mountain", "saved", "tagged"];
const OTHER_TABS: ProfileTab[] = ["posts", "mountain", "tagged"];

export default function Profile({
  profile,
  isOwn,
  posts,
  ranking,
  onOpenPost,
  onLogHike,
  onSignOut,
  friendUsernames,
  onToggleFriend,
}: {
  profile: Friend; // whose profile this is
  isOwn: boolean; // true when it's the signed-in user's own profile
  posts: FeedPost[];
  ranking: string[]; // this user's mountain, #1 first
  onOpenPost: (id: string) => void;
  onLogHike: () => void;
  onSignOut: () => void;
  friendUsernames: string[];
  onToggleFriend: (username: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [showAddFriends, setShowAddFriends] = useState(false);
  const [friendQuery, setFriendQuery] = useState("");
  const firstName = profile.name.split(" ")[0];
  const identity = [profile.username.toLowerCase(), profile.name.toLowerCase()];
  const ownPosts = posts.filter((post) => post.friend.id === profile.id);
  const savedPosts = posts.filter((post) => post.saved);
  const taggedPosts = posts.filter((post) => post.taggedUsers?.some((tag) => identity.includes(tag.toLowerCase())));
  const directory = useMemo(() => [...Object.values(friends), ...suggestions], []);
  const visibleFriends = directory.filter((friend) => friendUsernames.includes(friend.username));
  const isFriend = friendUsernames.includes(profile.username);
  const matchingSuggestions = suggestions.filter((friend) =>
    `${friend.name} ${friend.username}`.toLowerCase().includes(friendQuery.trim().toLowerCase()),
  );
  const tabs = isOwn ? OWN_TABS : OTHER_TABS;
  const visiblePosts =
    activeTab === "posts" ? ownPosts : activeTab === "saved" ? savedPosts : taggedPosts;

  const emptyCopy: Record<"posts" | "saved" | "tagged", { title: string; body: string }> = isOwn
    ? {
        posts: { title: "Your trail stories start here", body: "Log a hike and share the view with your crew." },
        saved: { title: "No saved hikes yet", body: "Save a hike from the feed and it will show up here." },
        tagged: { title: "No tagged hikes yet", body: "When a friend tags you in a hike, it will show up here." },
      }
    : {
        posts: { title: "No hikes posted yet", body: `When ${firstName} logs a hike, it will show up here.` },
        saved: { title: "", body: "" },
        tagged: { title: "No tagged hikes yet", body: `Hikes ${firstName} is tagged in will show up here.` },
      };

  return (
    <section className="screen-content profile-screen">
      <header className="profile-heading">
        <div className="profile-identity">
          <span aria-hidden="true" className="profile-avatar" style={{ background: profile.color }}>
            {profile.avatar ? <img alt="" src={profile.avatar} /> : profile.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <span className="eyebrow">TrailMix hiker</span>
            <h1>{profile.name}</h1>
            <p>@{profile.username}</p>
          </div>
        </div>
        {isOwn ? (
          <button
            aria-label="Add friends"
            className="profile-add-button"
            onClick={() => setShowAddFriends(true)}
            type="button"
          >
            <span aria-hidden="true">+</span>
            <span>Add friends</span>
          </button>
        ) : (
          <button
            aria-pressed={isFriend}
            className={`profile-add-button ${isFriend ? "following" : ""}`}
            onClick={() => onToggleFriend(profile.username)}
            type="button"
          >
            <span aria-hidden="true">{isFriend ? "✓" : "+"}</span>
            <span>{isFriend ? "Following" : "Add friend"}</span>
          </button>
        )}
      </header>

      <div aria-label="Profile stats" className="profile-stats">
        <div><b>{ownPosts.length}</b><span>Posts</span></div>
        <div><b>{taggedPosts.length}</b><span>Tagged</span></div>
        {isOwn ? (
          <button
            aria-pressed={activeTab === "friends"}
            className={activeTab === "friends" ? "selected" : ""}
            onClick={() => setActiveTab(activeTab === "friends" ? "posts" : "friends")}
            type="button"
          >
            <b>{visibleFriends.length}</b><span>Friends</span>
          </button>
        ) : (
          <div><b>{ranking.length}</b><span>Ranked</span></div>
        )}
      </div>

      <div
        aria-label="Profile sections"
        className="profile-tabs"
        role="tablist"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
      >
        {tabs.map((tab) => (
          <button
            aria-selected={activeTab === tab}
            className={activeTab === tab ? "selected" : ""}
            key={tab}
            onClick={() => setActiveTab(tab)}
            role="tab"
            type="button"
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "friends" ? (
        <section aria-label="Friends" className="profile-friends">
          <div className="profile-section-heading">
            <div><span className="eyebrow">Your trail crew</span><h2>Friends</h2></div>
            <span>{visibleFriends.length}</span>
          </div>
          {visibleFriends.length > 0 ? visibleFriends.map((friend) => (
            <div className="profile-friend-row" key={friend.username}>
              <span className="profile-friend-avatar" style={{ background: friend.color }}>{friend.name.charAt(0)}</span>
              <span className="profile-friend-copy"><b>{friend.name}</b><small>@{friend.username}</small></span>
              <button aria-label={`Remove ${friend.name}`} onClick={() => onToggleFriend(friend.username)} type="button">Following</button>
            </div>
          )) : (
            <div className="profile-empty"><h2>Your crew starts here</h2><p>Add a friend to see their trail stories.</p></div>
          )}
        </section>
      ) : activeTab === "mountain" ? (
        ranking.length > 0 ? (
          <section aria-label={isOwn ? "Your mountain" : `${firstName}'s mountain`} className="profile-mountain">
            <MountainScene ranking={ranking} />
            <ol className="profile-rank-list">
              {ranking.map((name, index) => (
                <li key={name}><b>#{index + 1}</b>{name}</li>
              ))}
            </ol>
          </section>
        ) : (
          <div className="profile-empty">
            <span aria-hidden="true" className="profile-empty-mark">▲</span>
            <h2>No ranked hikes yet</h2>
            <p>{isOwn ? "Log a hike to start building your mountain." : `${firstName} hasn't ranked any hikes yet.`}</p>
            {isOwn && <button className="profile-empty-action" onClick={onLogHike} type="button">Log a hike</button>}
          </div>
        )
      ) : visiblePosts.length > 0 ? (
        <div
          aria-label={
            activeTab === "posts"
              ? isOwn ? "Your posts" : `${firstName}'s posts`
              : activeTab === "saved"
                ? "Your saved hikes"
                : isOwn ? "Posts you are tagged in" : `Posts ${firstName} is tagged in`
          }
          className="profile-grid"
        >
          {visiblePosts.map((post) => (
            <button
              aria-label={`Open ${post.friend.name}'s hike at ${post.trail.name}`}
              className="profile-grid-tile"
              key={post.id}
              onClick={() => onOpenPost(post.id)}
              type="button"
            >
              <img alt="" src={post.image} />
              <span>{post.trail.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="profile-empty">
          <span aria-hidden="true" className="profile-empty-mark">
            {activeTab === "posts" ? "↗" : activeTab === "saved" ? (
              <svg fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M6 3.5h12a1 1 0 0 1 1 1v16l-7-4.6-7 4.6v-16a1 1 0 0 1 1-1Z" />
              </svg>
            ) : "@"}
          </span>
          <h2>{emptyCopy[activeTab].title}</h2>
          <p>{emptyCopy[activeTab].body}</p>
          {isOwn && activeTab === "posts" && <button className="profile-empty-action" onClick={onLogHike} type="button">Log a hike</button>}
        </div>
      )}

      {showAddFriends && (
        <div className="friend-sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAddFriends(false); }}>
          <section aria-labelledby="friend-sheet-title" aria-modal="true" className="friend-sheet" role="dialog">
            <header>
              <div><span className="eyebrow">Find your people</span><h2 id="friend-sheet-title">Add friends</h2></div>
              <button aria-label="Close add friends" className="friend-sheet-close" onClick={() => setShowAddFriends(false)} type="button">×</button>
            </header>
            <label className="friend-search-field">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Search people"
                onChange={(event) => setFriendQuery(event.target.value)}
                placeholder="Search people..."
                value={friendQuery}
              />
            </label>
            <div className="friend-suggestion-list">
              {matchingSuggestions.length > 0 ? matchingSuggestions.map((friend) => {
                const added = friendUsernames.includes(friend.username);
                return (
                  <div className="profile-friend-row" key={friend.username}>
                    <span className="profile-friend-avatar" style={{ background: friend.color }}>{friend.name.charAt(0)}</span>
                    <span className="profile-friend-copy"><b>{friend.name}</b><small>@{friend.username}</small></span>
                    <button
                      aria-pressed={added}
                      className={added ? "added" : ""}
                      onClick={() => onToggleFriend(friend.username)}
                      type="button"
                    >
                      {added ? "Added" : "Add"}
                    </button>
                  </div>
                );
              }) : <p className="friend-suggestion-empty">No people found. Try another search.</p>}
            </div>
          </section>
        </div>
      )}
      {isOwn && <button className="auth-signout profile-signout" onClick={onSignOut} type="button">Sign out</button>}
    </section>
  );
}
