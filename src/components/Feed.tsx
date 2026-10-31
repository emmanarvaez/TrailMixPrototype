import { useState } from "react";
import HikePost, { postActions } from "./HikePost";
import type { FeedPost } from "../data/feedPosts";

export default function Feed({
  posts,
  onUpdatePost,
}: {
  posts: FeedPost[];
  onUpdatePost: (id: string, update: (post: FeedPost) => FeedPost) => void;
}) {
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  const visiblePosts = search
    ? posts.filter((post) =>
        [post.trail.name, post.friend.name, post.friend.username].some((value) => value.toLowerCase().includes(search)),
      )
    : posts;

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

      {visiblePosts.length > 0 ? (
        <div className="feed-list">
          {visiblePosts.map((post) => (
            <HikePost key={post.id} post={post} {...postActions(post, onUpdatePost)} />
          ))}
        </div>
      ) : (
        <div className="feed-empty">
          <img alt="" src="/assets/cashew.svg" />
          <h2>No hikes found</h2>
          <p>None of your friends have logged a hike matching “{query.trim()}” yet.</p>
          <button onClick={() => setQuery("")} type="button">Clear search</button>
        </div>
      )}
    </section>
  );
}
