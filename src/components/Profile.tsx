import { useEffect, useState } from "react";
import MountainScene from "./MountainScene";
import { usePosts } from "../context/PostsContext";
import { fetchSavedLogIds, fetchTaggedLogIds } from "../lib/db";
import type { FeedPost, Friend } from "../types";

type ProfileTab = "posts" | "mountain" | "saved" | "tagged" | "friends";

// Saved hikes are private, so they only appear on your own profile. The friends list
// isn't a tab: it opens from the Friends count under your profile picture.
const OWN_TABS: ProfileTab[] = ["posts", "mountain", "saved", "tagged"];
const OTHER_TABS: ProfileTab[] = ["posts", "mountain", "tagged"];

export default function Profile({
  profile,
  isOwn,
  ranking,
  friends,
  following,
  onOpenPost,
  onOpenProfile,
  onLogHike,
  onFindFriends,
  onToggleFollow,
}: {
  profile: Friend; // whose profile this is
  isOwn: boolean; // true when it's the signed-in user's own profile
  ranking: string[]; // this user's mountain, #1 first
  friends: Friend[]; // people the signed-in user follows (shown on their own profile)
  following: string[]; // IDs the signed-in user follows
  onOpenPost: (id: string) => void;
  onOpenProfile: (id: string) => void;
  onLogHike: () => void;
  onFindFriends: () => void;
  onToggleFollow: (person: Friend) => void;
}) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const { posts, loadPosts } = usePosts();
  // Post IDs for each list; null while loading
  const [ownIds, setOwnIds] = useState<string[] | null>(null);
  const [taggedIds, setTaggedIds] = useState<string[] | null>(null);
  const [savedIds, setSavedIds] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const firstName = profile.name.split(" ")[0];
  const isFriend = following.includes(profile.id);
  const tabs = isOwn ? OWN_TABS : OTHER_TABS;

  useEffect(() => {
    const fail = (error: { message?: string }) => setLoadError(error?.message ?? "Something went wrong.");
    loadPosts({ userIds: [profile.id] }).then(setOwnIds).catch(fail);
    fetchTaggedLogIds(profile.id)
      .then((ids) => loadPosts({ logIds: ids }))
      .then(setTaggedIds)
      .catch(fail);
  }, [profile.id, loadPosts]);

  useEffect(() => {
    if (activeTab !== "saved" || savedIds !== null) return;
    fetchSavedLogIds(profile.id)
      .then((ids) => loadPosts({ logIds: ids }))
      .then(setSavedIds)
      .catch((error) => setLoadError(error?.message ?? "Something went wrong."));
  }, [activeTab, savedIds, profile.id, loadPosts]);

  const toPosts = (ids: string[] | null) => (ids ?? []).map((id) => posts[id]).filter((post): post is FeedPost => !!post);
  // Unsaving a hike elsewhere removes it from the Saved tab straight away
  const listIds = activeTab === "posts" ? ownIds : activeTab === "saved" ? savedIds : taggedIds;
  const visiblePosts = activeTab === "saved" ? toPosts(savedIds).filter((post) => post.saved) : toPosts(listIds);

  const emptyCopy: Record<"posts" | "saved" | "tagged", { title: string; body: string }> = isOwn
    ? {
        posts: { title: "No posts yet", body: "Log a hike and share the view with your crew." },
        saved: { title: "No saved hikes yet", body: "Save a hike from the feed and it will show up here." },
        tagged: { title: "No tagged hikes yet", body: "When a friend tags you in a hike, it will show up here." },
      }
    : {
        posts: { title: "No posts yet", body: `When ${firstName} logs a hike, it will show up here.` },
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
          <button aria-label="Add friends" className="profile-add-button" onClick={onFindFriends} type="button">
            <span aria-hidden="true">+</span>
            <span>Add friends</span>
          </button>
        ) : (
          <button
            aria-pressed={isFriend}
            className={`profile-add-button ${isFriend ? "following" : ""}`}
            onClick={() => onToggleFollow(profile)}
            type="button"
          >
            <span aria-hidden="true">{isFriend ? "✓" : "+"}</span>
            <span>{isFriend ? "Following" : "Add friend"}</span>
          </button>
        )}
      </header>

      {/* Counts always show a number: 0 while loading or when there's nothing yet */}
      <div aria-label="Profile stats" className="profile-stats">
        <div><b>{ownIds?.length ?? 0}</b><span>Posts</span></div>
        <div><b>{taggedIds?.length ?? 0}</b><span>Tagged</span></div>
        {isOwn ? (
          <button
            aria-pressed={activeTab === "friends"}
            className={activeTab === "friends" ? "selected" : ""}
            onClick={() => setActiveTab(activeTab === "friends" ? "posts" : "friends")}
            type="button"
          >
            <b>{friends.length}</b><span>Friends</span>
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

      {loadError && <p className="trail-search-note" role="alert">Couldn't load this profile: {loadError}</p>}

      {activeTab === "friends" ? (
        <section aria-label="Friends" className="profile-friends">
          <div className="profile-section-heading">
            <div><span className="eyebrow">Your trail crew</span><h2>Friends</h2></div>
            <span>{friends.length}</span>
          </div>
          {friends.length > 0 ? friends.map((friend) => (
            <div className="profile-friend-row" key={friend.id}>
              <button className="profile-link profile-friend-person" onClick={() => onOpenProfile(friend.id)} type="button">
                <span className="profile-friend-avatar" style={{ background: friend.color }}>
                  {friend.avatar ? <img alt="" src={friend.avatar} /> : friend.name.charAt(0).toUpperCase()}
                </span>
                <span className="profile-friend-copy"><b>{friend.name}</b><small>@{friend.username}</small></span>
              </button>
              <button aria-label={`Remove ${friend.name}`} onClick={() => onToggleFollow(friend)} type="button">Following</button>
            </div>
          )) : (
            <div className="profile-empty">
              <h2>Your crew starts here</h2>
              <p>Add a friend to see their trail stories.</p>
              <button className="profile-empty-action" onClick={onFindFriends} type="button">Find friends</button>
            </div>
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
            <img alt="" className="profile-empty-cashew" src="/assets/cashew-11-sleepy.svg" />
            <h2>{isOwn ? "Your mountain is empty" : "No ranked hikes yet"}</h2>
            <p>{isOwn ? "Log your first hike to start climbing." : `${firstName} hasn't ranked any hikes yet.`}</p>
            {isOwn && <button className="profile-empty-action" onClick={onLogHike} type="button">Log a Hike</button>}
          </div>
        )
      ) : listIds === null ? (
        <p className="trail-search-note">Loading hikes…</p>
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
          {visiblePosts.map((post) => {
            const cover = post.media[0];
            return (
              <button
                aria-label={`Open ${post.friend.name}'s hike at ${post.trail.name}`}
                className="profile-grid-tile"
                key={post.id}
                onClick={() => onOpenPost(post.id)}
                type="button"
              >
                {cover?.type === "video" ? (
                  <video muted playsInline preload="metadata" src={`${cover.url}#t=0.1`} />
                ) : (
                  <img alt="" src={cover?.url ?? post.trail.image} />
                )}
                {post.media.length > 1 && <i aria-hidden="true" className="profile-grid-multi">❐</i>}
                {cover?.type === "video" && <i aria-hidden="true" className="profile-grid-play">▶</i>}
                <span>{post.trail.name}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="profile-empty">
          {activeTab === "posts" ? (
            <img alt="" className="profile-empty-cashew" src="/assets/cashew-10-hiker.svg" />
          ) : (
            <span aria-hidden="true" className="profile-empty-mark">
              {activeTab === "saved" ? (
                <svg fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 3.5h12a1 1 0 0 1 1 1v16l-7-4.6-7 4.6v-16a1 1 0 0 1 1-1Z" />
                </svg>
              ) : "@"}
            </span>
          )}
          <h2>{emptyCopy[activeTab].title}</h2>
          <p>{emptyCopy[activeTab].body}</p>
          {isOwn && activeTab === "posts" && <button className="profile-empty-action" onClick={onLogHike} type="button">Log a Hike</button>}
        </div>
      )}
    </section>
  );
}
