import { useState } from "react";
import HikePost from "./HikePost";
import Leaderboard from "./Leaderboard";
import type { FeedPost } from "../types";

export default function Feed({
  posts,
  loadError,
  onFindFriends,
  friendIds,
  leaderboardKey,
}: {
  posts: FeedPost[] | null; // you and your friends, newest first; null while loading
  loadError: string;
  onFindFriends: () => void;
  friendIds: string[]; // for the Leaderboard tab
  leaderboardKey: number; // changes when your own hikes change, so the Leaderboard reloads
}) {
  const [view, setView] = useState<"feed" | "leaderboard">("feed");
  // Archived posts only appear in their owner's Archived list
  const visible = (posts ?? []).filter((post) => !post.archived);

  return (
    <section className="screen-content feed-screen">
      <div className="accom-tabs feed-tabs" role="tablist">
        <button
          aria-selected={view === "feed"}
          className={`accom-tab-btn ${view === "feed" ? "active" : ""}`}
          onClick={() => setView("feed")}
          role="tab"
          type="button"
        >
          Feed
        </button>
        <button
          aria-selected={view === "leaderboard"}
          className={`accom-tab-btn ${view === "leaderboard" ? "active" : ""}`}
          onClick={() => setView("leaderboard")}
          role="tab"
          type="button"
        >
          Leaderboard
        </button>
      </div>

      {view === "leaderboard" ? (
        <Leaderboard friendIds={friendIds} onFindFriends={onFindFriends} refreshKey={leaderboardKey} />
      ) : posts !== null && visible.length === 0 && !loadError ? (
        <div className="feed-empty feed-empty-start">
          <img alt="" src="/assets/cashew-11-sleepy.svg" />
          <h2>No hikes yet!</h2>
          <p>Add friends to see where they're hiking.</p>
          <button onClick={onFindFriends} type="button">Find friends</button>
        </div>
      ) : (
        <>
          <div className="section-heading">
            <h2>From your trail crew</h2>
            <span>{visible.length} {visible.length === 1 ? "hike" : "hikes"}</span>
          </div>
          {loadError && <p className="trail-search-note" role="alert">Couldn't load the feed: {loadError}</p>}
          {!loadError && posts === null && <p className="trail-search-note">Loading hikes…</p>}
          <div className="feed-list">
            {visible.map((post) => <HikePost key={post.id} post={post} />)}
          </div>
        </>
      )}
    </section>
  );
}
