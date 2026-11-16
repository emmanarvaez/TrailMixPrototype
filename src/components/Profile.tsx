import { useEffect, useState } from "react";
import FriendButton from "./FriendButton";
import MountainScene from "./MountainScene";
import PeopleList from "./PeopleList";
import { usePosts } from "../context/PostsContext";
import { handle, useUsers } from "../context/UsersContext";
import {
  fetchFriendIds,
  fetchProfiles,
  fetchSavedLogIds,
  fetchTaggedLogIds,
  friendStatus,
  type FriendAction,
  type FriendState,
} from "../lib/db";
import type { FeedPost, Friend } from "../types";

type ProfileTab = "posts" | "mountain" | "saved" | "tagged" | "friends";

// Saved hikes are private, so they only appear on your own profile. Friends isn't a
// tab: the list opens from the Friends count under the profile picture.
const OWN_TABS: ProfileTab[] = ["posts", "mountain", "saved", "tagged"];
const OTHER_TABS: ProfileTab[] = ["posts", "mountain", "tagged"];

export default function Profile({
  profile,
  isOwn,
  ranking,
  currentUserId,
  friendState,
  onOpenPost,
  onOpenProfile,
  onLogHike,
  onFindFriends,
  onFriendAction,
}: {
  profile: Friend; // whose profile this is
  isOwn: boolean; // true when it's the signed-in user's own profile
  ranking: string[]; // this user's mountain, #1 first
  currentUserId: string;
  friendState: FriendState; // the signed-in user's friends and requests
  onOpenPost: (id: string) => void;
  onOpenProfile: (id: string) => void;
  onLogHike: () => void;
  onFindFriends: () => void;
  onFriendAction: (person: Friend, action: FriendAction) => void;
}) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  // Your own archived hikes, shown in place of your posts when opened
  const [showArchived, setShowArchived] = useState(false);
  const { posts, loadPosts } = usePosts();
  // Post IDs for each list; null while loading
  const [ownIds, setOwnIds] = useState<string[] | null>(null);
  const [taggedIds, setTaggedIds] = useState<string[] | null>(null);
  const [savedIds, setSavedIds] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState("");
  // This profile's accepted friends (IDs), plus their profiles once the list is opened
  const [friendIds, setFriendIds] = useState<string[] | null>(null);
  const [people, setPeople] = useState<Friend[] | null>(null);
  const { getUser } = useUsers();
  const firstName = profile.name.split(" ")[0];
  const status = friendStatus(friendState, profile.id);
  // Hikes are friends-only: you see your own and your friends'. The database enforces this too.
  const canView = isOwn || status === "friends";
  const tabs = isOwn ? OWN_TABS : OTHER_TABS;
  const showingPeople = activeTab === "friends";
  const incoming = isOwn ? friendState.incoming.map(getUser) : [];

  // Reloaded whenever the signed-in user's friendships change, so the count stays right
  const myFriendsKey = friendState.friends.join(",");
  useEffect(() => {
    fetchFriendIds(profile.id)
      .then(setFriendIds)
      .catch((error) => setLoadError(error?.message ?? "Something went wrong."));
  }, [profile.id, myFriendsKey]);

  useEffect(() => {
    if (!showingPeople || friendIds === null) return;
    setPeople(null);
    fetchProfiles(friendIds)
      .then((found) => setPeople(friendIds.map((id) => found.find((person) => person.id === id)).filter((person): person is Friend => !!person)))
      .catch((error) => setLoadError(error?.message ?? "Something went wrong."));
  }, [showingPeople, friendIds]);

  useEffect(() => {
    if (!canView) {
      setOwnIds(null);
      setTaggedIds(null);
      return;
    }
    const fail = (error: { message?: string }) => setLoadError(error?.message ?? "Something went wrong.");
    loadPosts({ userIds: [profile.id] }).then(setOwnIds).catch(fail);
    fetchTaggedLogIds(profile.id)
      .then((ids) => loadPosts({ logIds: ids }))
      .then(setTaggedIds)
      .catch(fail);
  }, [profile.id, loadPosts, canView]);

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
  // Archived hikes only show in your own Archived list
  const archivedPosts = toPosts(ownIds).filter((post) => post.archived);
  const viewingArchive = isOwn && activeTab === "posts" && showArchived && archivedPosts.length > 0;
  const visiblePosts = viewingArchive
    ? archivedPosts
    : (activeTab === "saved" ? toPosts(savedIds).filter((post) => post.saved) : toPosts(listIds)).filter((post) => !post.archived);

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
            {handle(profile) && <p>{handle(profile)}</p>}
          </div>
        </div>
        {isOwn ? (
          <button aria-label="Add friends" className="profile-add-button" onClick={onFindFriends} type="button">
            <span aria-hidden="true">+</span>
            <span>Add friends</span>
          </button>
        ) : (
          <FriendButton
            name={handle(profile) || profile.name}
            onAction={(action) => onFriendAction(profile, action)}
            size="header"
            status={status}
          />
        )}
      </header>

      {/* Each profile shows its own owner's bio; "No bio yet" is only a hint, never saved */}
      {profile.bio ? (
        <p className="profile-bio">{profile.bio}</p>
      ) : (
        <p className="profile-bio empty">No bio yet</p>
      )}

      {/* Counts always show a number: 0 while loading or when there's nothing yet */}
      <div aria-label="Profile stats" className="profile-stats">
        <div><b>{canView ? toPosts(ownIds).filter((post) => !post.archived).length : "–"}</b><span>Posts</span></div>
        <button
          aria-pressed={showingPeople}
          className={showingPeople ? "selected" : ""}
          onClick={() => setActiveTab(showingPeople ? "posts" : "friends")}
          type="button"
        >
          <b>{friendIds?.length ?? 0}</b>
          <span>Friends</span>
          {incoming.length > 0 && <i className="friend-request-count">{incoming.length} new</i>}
        </button>
      </div>

      {canView && (
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
              onClick={() => { setActiveTab(tab); setShowArchived(false); }}
              role="tab"
              type="button"
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      )}

      {loadError && <p className="trail-search-note" role="alert">Couldn't load this profile: {loadError}</p>}

      {showingPeople ? (
        <section aria-label="Friends" className="profile-friends">
          {incoming.length > 0 && (
            <section aria-label="Friend requests" className="friend-requests">
              <div className="profile-section-heading">
                <div><span className="eyebrow">Waiting on you</span><h2>Friend requests</h2></div>
                <span>{incoming.length}</span>
              </div>
              <PeopleList
                currentUserId={currentUserId}
                friendState={friendState}
                onFriendAction={onFriendAction}
                onOpenProfile={onOpenProfile}
                people={incoming}
              />
            </section>
          )}
          <div className="profile-section-heading">
            <div>
              <span className="eyebrow">{isOwn ? "Your trail crew" : `${firstName}'s trail crew`}</span>
              <h2>Friends</h2>
            </div>
            <span>{friendIds?.length ?? 0}</span>
          </div>
          {people === null ? (
            <p className="trail-search-note">Loading…</p>
          ) : people.length > 0 ? (
            <PeopleList
              currentUserId={currentUserId}
              friendState={friendState}
              onFriendAction={onFriendAction}
              onOpenProfile={onOpenProfile}
              people={people}
            />
          ) : (
            <div className="profile-empty">
              <h2>No friends yet</h2>
              <p>{isOwn ? "Add friends to see their trail stories." : `When ${firstName} adds friends, they'll show up here.`}</p>
              {isOwn && <button className="profile-empty-action" onClick={onFindFriends} type="button">Find friends</button>}
            </div>
          )}
        </section>
      ) : !canView ? (
        <div className="profile-empty profile-locked">
          <span aria-hidden="true" className="profile-empty-mark">
            <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
              <rect height="10" rx="2.5" width="15" x="4.5" y="10.5" />
              <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <h2>{firstName}'s hikes are for friends</h2>
          <p>
            {status === "outgoing"
              ? `Once ${firstName} accepts your request, you'll see their hikes and mountain.`
              : status === "incoming"
                ? `Accept ${firstName}'s request to see each other's hikes.`
                : `Add ${firstName} as a friend to see their hikes and mountain.`}
          </p>
        </div>
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
      ) : null}

      {isOwn && activeTab === "posts" && archivedPosts.length > 0 && (
        <button className="profile-archive-toggle" onClick={() => setShowArchived(!showArchived)} type="button">
          {viewingArchive ? "← Back to your posts" : `Archived hikes (${archivedPosts.length})`}
        </button>
      )}

      {showingPeople || !canView || activeTab === "mountain" ? null : listIds === null ? (
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
