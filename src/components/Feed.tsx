import { useState } from "react";
import HikePost from "./HikePost";
import type { FeedPost } from "../types";

export default function Feed({
  posts,
  loadError,
  onFindFriends,
}: {
  posts: FeedPost[] | null; // null while loading
  loadError: string;
  onFindFriends: () => void;
}) {
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  const allPosts = posts ?? [];
  const visiblePosts = search
    ? allPosts.filter((post) =>
        [post.trail.name, post.friend.name, post.friend.username].some((value) => value.toLowerCase().includes(search)),
      )
    : allPosts;

  if (posts !== null && posts.length === 0 && !loadError) {
    return (
      <section className="screen-content feed-screen">
        <div className="feed-empty feed-empty-start">
          <img alt="" src="/assets/cashew-11-sleepy.svg" />
          <h2>No hikes yet!</h2>
          <p>Add friends to see where they're hiking.</p>
          <button onClick={onFindFriends} type="button">Find friends</button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen-content feed-screen">
      <label className="search-field feed-search">
        <span aria-hidden="true">⌕</span>
        <input
          aria-label="Search your friends' hikes"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your friends' hikes..."
          value={query}
        />
        {query && (
          <button aria-label="Clear search" className="search-clear" onClick={() => setQuery("")} type="button">×</button>
        )}
      </label>

      <div className="section-heading">
        <h2>{search ? "Matching hikes" : "From your trail crew"}</h2>
        <span>{visiblePosts.length} {visiblePosts.length === 1 ? "hike" : "hikes"}</span>
      </div>

      {loadError && <p className="trail-search-note" role="alert">Couldn't load the feed: {loadError}</p>}
      {!loadError && posts === null && <p className="trail-search-note">Loading hikes…</p>}

      {visiblePosts.length > 0 ? (
        <div className="feed-list">
          {visiblePosts.map((post) => <HikePost key={post.id} post={post} />)}
        </div>
      ) : search ? (
        <div className="feed-empty">
          <img alt="" src="/assets/cashew.svg" />
          <h2>No hikes found</h2>
          <p>None of your friends have logged a hike matching “{query.trim()}” yet.</p>
          <button onClick={() => setQuery("")} type="button">Clear search</button>
        </div>
      ) : null}
    </section>
  );
}
