import { useState, type FormEvent } from "react";
import type { FeedPost } from "../data/feedPosts";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.8 3.8 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.4 0 5.6 3.3 4.4 6.7-1.7 4.7-9.2 9.3-9.2 9.3Z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20.5 11.6c0 4.4-3.8 7.9-8.5 7.9-1.3 0-2.5-.3-3.6-.7L3.5 20.5l1.4-4.1c-.9-1.4-1.4-3-1.4-4.8C3.5 7.2 7.3 3.7 12 3.7s8.5 3.5 8.5 7.9Z" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 3.5h12a1 1 0 0 1 1 1v16l-7-4.6-7 4.6v-16a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function plural(count: number, word: string) {
  return `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;
}

export default function HikePost({
  post,
  onToggleLike,
  onToggleSave,
  onAddComment,
}: {
  post: FeedPost;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onAddComment: (text: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [burst, setBurst] = useState(0);
  const { friend, trail } = post;

  const submitComment = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAddComment(text);
    setDraft("");
  };

  // Double-tap the photo to like (never unlikes), like Instagram.
  const likeFromPhoto = () => {
    if (!post.liked) onToggleLike();
    setBurst((count) => count + 1);
  };

  return (
    <article className="hike-post">
      <header className="post-header">
        <span className="post-avatar" style={{ background: friend.color }}>{friend.name.charAt(0)}</span>
        <div className="post-author">
          <span className="post-author-line">
            <b>{friend.name}</b>
            <small>@{friend.username}</small>
          </span>
          <span className="post-trail">hiked <strong>{trail.name}</strong></span>
        </div>
        <time className="post-date" dateTime={post.date}>{formatDate(post.date)}</time>
      </header>

      <div className="post-photo" onDoubleClick={likeFromPhoto}>
        <img alt={`${friend.name} on ${trail.name}`} draggable={false} src={post.image} />
        {burst > 0 && (
          <span className="like-burst" key={burst}>
            <HeartIcon filled />
          </span>
        )}
        <div className="post-stats">
          <span className="post-stat">{trail.distance}</span>
          <span className="post-stat">↑ {trail.elevation}</span>
          <span className={`post-stat difficulty-${trail.difficulty.toLowerCase()}`}>{trail.difficulty}</span>
        </div>
      </div>

      <div className="post-actions">
        <button
          aria-label={post.liked ? "Unlike" : "Like"}
          aria-pressed={post.liked}
          className={`post-action ${post.liked ? "liked" : ""}`}
          onClick={onToggleLike}
          type="button"
        >
          <HeartIcon filled={post.liked} />
        </button>
        <button
          aria-expanded={showComments}
          aria-label="Comments"
          className={`post-action ${showComments ? "open" : ""}`}
          onClick={() => setShowComments((open) => !open)}
          type="button"
        >
          <CommentIcon />
        </button>
        <button
          aria-label={post.saved ? "Unsave hike" : "Save hike"}
          aria-pressed={post.saved}
          className={`post-action save ${post.saved ? "saved" : ""}`}
          onClick={onToggleSave}
          type="button"
        >
          <BookmarkIcon filled={post.saved} />
        </button>
      </div>

      <div className="post-body">
        <div className="post-counts">
          <b>{plural(post.likes, "like")}</b>
          <button onClick={() => setShowComments((open) => !open)} type="button">
            {plural(post.comments.length, "comment")}
          </button>
        </div>
        <p className="post-caption">
          <b>{friend.username}</b>
          {post.caption}
        </p>

        {showComments && (
          <div className="post-comments">
            {post.comments.map((comment) => (
              <p className="post-comment" key={comment.id}>
                <b>{comment.author.username}</b>
                {comment.text}
              </p>
            ))}
            {post.comments.length === 0 && <p className="post-comment empty">No comments yet. Say something nice!</p>}
            <form className="comment-form" onSubmit={submitComment}>
              <input
                aria-label="Add a comment"
                autoFocus
                maxLength={200}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Add a comment..."
                value={draft}
              />
              <button disabled={!draft.trim()} type="submit">Post</button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}
