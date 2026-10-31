import { useEffect, useState } from "react";
import MountainScene from "./MountainScene";
import PeopleList from "./PeopleList";
import { usePosts } from "../context/PostsContext";
import { handle } from "../context/UsersContext";
import { fetchFollowers, fetchFollowing, fetchProfiles, fetchSavedLogIds, fetchTaggedLogIds } from "../lib/db";
import type { FeedPost, Friend } from "../types";

type ProfileTab = "posts" | "mountain" | "saved" | "tagged" | "followers" | "following";

// Saved hikes are private, so they only appear on your own profile. Followers and
// following aren't tabs: they open from the counts under the profile picture.
const OWN_TABS: ProfileTab[] = ["posts", "mountain", "saved", "tagged"];
const OTHER_TABS: ProfileTab[] = ["posts", "mountain", "tagged"];

export default function Profile({
  profile,
  isOwn,
  ranking,
  currentUserId,
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
  currentUserId: string;
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
  // This profile's followers and the people it follows (IDs), plus their profiles once a list is opened
  const [followerIds, setFollowerIds] = useState<string[] | null>(null);
  const [followingIds, setFollowingIds] = useState<string[] | null>(null);
  const [people, setPeople] = useState<Friend[] | null>(null);
  const firstName = profile.name.split(" ")[0];
  const isFriend = following.includes(profile.id);
  const tabs = isOwn ? OWN_TABS : OTHER_TABS;
  const showingPeople = activeTab === "followers" || activeTab === "following";
  const peopleIds = activeTab === "followers" ? followerIds : followingIds;

  // Reloaded when the signed-in user follows or unfollows someone, so counts stay right
  useEffect(() => {
    Promise.all([fetchFollowers(profile.id), fetchFollowing(profile.id)])
      .then(([followers, followed]) => {
        setFollowerIds(followers);
        setFollowingIds(followed);
      })
      .catch((error) => setLoadError(error?.message ?? "Something went wrong."));
  }, [profile.id, following]);

  useEffect(() => {
    if (!showingPeople || peopleIds === null) return;
    setPeople(null);
    fetchProfiles(peopleIds)
      .then((found) => setPeople(peopleIds.map((id) => found.find((person) => person.id === id)).filter((person): person is Friend => !!person)))
      .catch((error) => setLoadError(error?.message ?? "Something went wrong."));
  }, [showingPeople, peopleIds]);

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
            {handle(profile) && <p>{handle(profile)}</p>}
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
            <span>{isFriend ? "Following" : "Follow"}</span>
          </button>
        )}
      </header>

      {/* Counts always show a number: 0 while loading or when there's nothing yet */}
      <div aria-label="Profile stats" className="profile-stats">
        <div><b>{ownIds?.length ?? 0}</b><span>Posts</span></div>
        {(["followers", "following"] as const).map((list) => (
          <button
            aria-pressed={activeTab === list}
            className={activeTab === list ? "selected" : ""}
            key={list}
            onClick={() => setActiveTab(activeTab === list ? "posts" : list)}
            type="button"
          >
            <b>{(list === "followers" ? followerIds : followingIds)?.length ?? 0}</b>
            <span>{list === "followers" ? "Followers" : "Following"}</span>
          </button>
        ))}
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

      {showingPeople ? (
        <section aria-label={activeTab === "followers" ? "Followers" : "Following"} className="profile-friends">
          <div className="profile-section-heading">
            <div>
              <span className="eyebrow">{isOwn ? "Your trail crew" : `${firstName}'s trail crew`}</span>
              <h2>{activeTab === "followers" ? "Followers" : "Following"}</h2>
            </div>
            <span>{peopleIds?.length ?? 0}</span>
          </div>
          {people === null ? (
            <p className="trail-search-note">Loading…</p>
          ) : people.length > 0 ? (
            <PeopleList
              currentUserId={currentUserId}
              following={following}
              onOpenProfile={onOpenProfile}
              onToggleFollow={onToggleFollow}
              people={people}
            />
          ) : (
            <div className="profile-empty">
              <h2>{activeTab === "followers" ? "No followers yet" : "Not following anyone yet"}</h2>
              <p>
                {activeTab === "followers"
                  ? isOwn ? "When people follow you, they'll show up here." : `When people follow ${firstName}, they'll show up here.`
                  : isOwn ? "Follow friends to see their trail stories." : `${firstName} isn't following anyone yet.`}
              </p>
              {isOwn && activeTab === "following" && (
                <button className="profile-empty-action" onClick={onFindFriends} type="button">Find friends</button>
              )}
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
