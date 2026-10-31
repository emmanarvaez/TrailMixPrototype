import HikePost from "./HikePost";
import type { FeedPost } from "../types";

export default function Feed({
  posts,
  loadError,
  onFindFriends,
}: {
  posts: FeedPost[] | null; // you and the people you follow, newest first; null while loading
  loadError: string;
  onFindFriends: () => void;
}) {
  // Archived posts only appear in their owner's Archived list
  const visible = (posts ?? []).filter((post) => !post.archived);

  if (posts !== null && visible.length === 0 && !loadError) {
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
      <div className="section-heading">
        <h2>From your trail crew</h2>
        <span>{visible.length} {visible.length === 1 ? "hike" : "hikes"}</span>
      </div>
      {loadError && <p className="trail-search-note" role="alert">Couldn't load the feed: {loadError}</p>}
      {!loadError && posts === null && <p className="trail-search-note">Loading hikes…</p>}
      <div className="feed-list">
        {visible.map((post) => <HikePost key={post.id} post={post} />)}
      </div>
    </section>
  );
}
