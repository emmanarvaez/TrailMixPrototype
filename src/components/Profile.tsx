import { useMemo, useState } from "react";
import HikePost from "./HikePost";
import { friends, type FeedPost, type Friend } from "../data/feedPosts";
import type { AuthUser } from "./Authpage";
import { usernameFor } from "../context/UsersContext";

const suggestions: Friend[] = [
  { id: "mock-maya", name: "Maya Chen", username: "mayatreks", color: "#4b806b" },
  { id: "mock-luca", name: "Luca Rivera", username: "lucarambles", color: "#b75d3d" },
  { id: "mock-nina", name: "Nina Brooks", username: "ninabrooks", color: "#71819a" },
];

type ProfileTab = "posts" | "saved" | "tagged" | "friends";

export default function Profile({
  user,
  posts,
  onUpdatePost,
  onLogHike,
  onSignOut,
  friendUsernames,
  onToggleFriend,
}: {
  user: AuthUser;
  posts: FeedPost[];
  onUpdatePost: (id: string, update: (post: FeedPost) => FeedPost) => void;
  onLogHike: () => void;
  onSignOut: () => void;
  friendUsernames: string[];
  onToggleFriend: (username: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [showAddFriends, setShowAddFriends] = useState(false);
  const [friendQuery, setFriendQuery] = useState("");
  const username = usernameFor(user);
  const identity = [username, user.name.toLowerCase()];
  const ownPosts = posts.filter((post) => identity.includes(post.friend.username.toLowerCase()));
  const savedPosts = posts.filter((post) => post.saved);
  const taggedPosts = posts.filter((post) => post.taggedUsers?.some((tag) => identity.includes(tag.toLowerCase())));
  const directory = useMemo(() => [...Object.values(friends), ...suggestions], []);
  const visibleFriends = directory.filter((friend) => friendUsernames.includes(friend.username));
  const matchingSuggestions = suggestions.filter((friend) =>
    `${friend.name} ${friend.username}`.toLowerCase().includes(friendQuery.trim().toLowerCase()),
  );
  const visiblePosts =
    activeTab === "posts" ? ownPosts : activeTab === "saved" ? savedPosts : taggedPosts;

  const renderPost = (post: FeedPost) => (
    <HikePost
      key={post.id}
      onAddComment={(comment) =>
        onUpdatePost(post.id, (current) => ({ ...current, comments: [...current.comments, comment] }))
      }
      onToggleLike={() =>
        onUpdatePost(post.id, (current) => ({
          ...current,
          liked: !current.liked,
          likes: current.likes + (current.liked ? -1 : 1),
        }))
      }
      onToggleSave={() => onUpdatePost(post.id, (current) => ({ ...current, saved: !current.saved }))}
      post={post}
    />
  );

  return (
    <section className="screen-content profile-screen">
      <header className="profile-heading">
        <div className="profile-identity">
          <span aria-hidden="true" className="profile-avatar">{user.avatar ? <img alt="" src={user.avatar} /> : user.name.charAt(0).toUpperCase()}</span>
          <div>
            <span className="eyebrow">TrailMix hiker</span>
            <h1>{user.name}</h1>
            <p>@{username}</p>
          </div>
        </div>
        <button
          aria-label="Add friends"
          className="profile-add-button"
          onClick={() => setShowAddFriends(true)}
          type="button"
        >
          <span aria-hidden="true">+</span>
          <span>Add friends</span>
        </button>
      </header>

      <div aria-label="Profile stats" className="profile-stats">
        <div><b>{ownPosts.length}</b><span>Posts</span></div>
        <div><b>{taggedPosts.length}</b><span>Tagged</span></div>
        <div><b>{visibleFriends.length}</b><span>Friends</span></div>
      </div>

      <div aria-label="Profile sections" className="profile-tabs" role="tablist">
        {(["posts", "saved", "tagged", "friends"] as const).map((tab) => (
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
      ) : visiblePosts.length > 0 ? (
        <div
          aria-label={
            activeTab === "posts"
              ? "Your posts"
              : activeTab === "saved"
                ? "Your saved hikes"
                : "Posts you are tagged in"
          }
          className="profile-posts"
        >
          {visiblePosts.map(renderPost)}
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
          <h2>
            {activeTab === "posts"
              ? "Your trail stories start here"
              : activeTab === "saved"
                ? "No saved hikes yet"
                : "No tagged hikes yet"}
          </h2>
          <p>
            {activeTab === "posts"
              ? "Log a hike and share the view with your crew."
              : activeTab === "saved"
                ? "Save a hike from the feed and it will show up here."
                : "When a friend tags you in a hike, it will show up here."}
          </p>
          {activeTab === "posts" && <button className="profile-empty-action" onClick={onLogHike} type="button">Log a hike</button>}
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
                const isFriend = friendUsernames.includes(friend.username);
                return (
                  <div className="profile-friend-row" key={friend.username}>
                    <span className="profile-friend-avatar" style={{ background: friend.color }}>{friend.name.charAt(0)}</span>
                    <span className="profile-friend-copy"><b>{friend.name}</b><small>@{friend.username}</small></span>
                    <button
                      aria-pressed={isFriend}
                      className={isFriend ? "added" : ""}
                      onClick={() => onToggleFriend(friend.username)}
                      type="button"
                    >
                      {isFriend ? "Added" : "Add"}
                    </button>
                  </div>
                );
              }) : <p className="friend-suggestion-empty">No people found. Try another search.</p>}
            </div>
          </section>
        </div>
      )}
      <button className="auth-signout profile-signout" onClick={onSignOut} type="button">Sign out</button>
    </section>
  );
}