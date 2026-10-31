import { useState } from "react";
import HikePost from "./HikePost";
import PeopleList from "./PeopleList";
import { usePeopleSearch } from "./usePeopleSearch";
import type { FeedPost, Friend } from "../types";

export default function Feed({
  posts,
  loadError,
  currentUserId,
  following,
  onToggleFollow,
  onOpenProfile,
  onFindFriends,
}: {
  posts: FeedPost[] | null; // you and the people you follow, newest first; null while loading
  loadError: string;
  currentUserId: string;
  following: string[];
  onToggleFollow: (person: Friend) => void;
  onOpenProfile: (id: string) => void;
  onFindFriends: () => void;
}) {
  const [query, setQuery] = useState("");
  const searching = query.trim().replace(/^@+/, "").length > 0;
  const people = usePeopleSearch(query, currentUserId);

  const searchBar = (
    <label className="search-field feed-search">
      <span aria-hidden="true">⌕</span>
      <input
        aria-label="Search for friends"
        autoCapitalize="none"
        autoCorrect="off"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search for friends..."
        value={query}
      />
      {query && (
        <button aria-label="Clear search" className="search-clear" onClick={() => setQuery("")} type="button">×</button>
      )}
    </label>
  );

  // While typing, the feed shows people instead of hikes
  if (searching) {
    return (
      <section className="screen-content feed-screen">
        {searchBar}
        <div className="section-heading"><h2>People</h2></div>
        {people.error && <p className="trail-search-note" role="alert">Couldn't search: {people.error}</p>}
        {!people.error && !people.searching && people.results.length === 0 && (
          <p className="trail-search-note">No one found with that username.</p>
        )}
        <div className="people-search-results">
          <PeopleList
            currentUserId={currentUserId}
            following={following}
            onOpenProfile={onOpenProfile}
            onToggleFollow={onToggleFollow}
            people={people.results}
          />
        </div>
      </section>
    );
  }

  if (posts !== null && posts.length === 0 && !loadError) {
    return (
      <section className="screen-content feed-screen">
        {searchBar}
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
      {searchBar}
      <div className="section-heading">
        <h2>From your trail crew</h2>
        <span>{(posts ?? []).length} {(posts ?? []).length === 1 ? "hike" : "hikes"}</span>
      </div>
      {loadError && <p className="trail-search-note" role="alert">Couldn't load the feed: {loadError}</p>}
      {!loadError && posts === null && <p className="trail-search-note">Loading hikes…</p>}
      <div className="feed-list">
        {(posts ?? []).map((post) => <HikePost key={post.id} post={post} />)}
      </div>
    </section>
  );
}
