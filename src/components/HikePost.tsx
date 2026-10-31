import { useState, type FormEvent } from "react";
import { useUsers } from "../context/UsersContext";
import type { FeedPost, Friend, PostComment } from "../data/feedPosts";

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

function Avatar({ person, className }: { person: Friend; className: string }) {
  return (
    <span aria-hidden="true" className={className} style={{ background: person.color }}>
      {person.avatar ? <img alt="" src={person.avatar} /> : person.name.charAt(0).toUpperCase()}
    </span>
  );
}

// Like, comment and save handlers for a post, shared by every screen that shows full posts
export function postActions(post: FeedPost, onUpdatePost: (id: string, update: (post: FeedPost) => FeedPost) => void) {
  return {
    onAddComment: (comment: PostComment) =>
      onUpdatePost(post.id, (current) => ({ ...current, comments: [...current.comments, comment] })),
    onToggleLike: () =>
      onUpdatePost(post.id, (current) => ({
        ...current,
        liked: !current.liked,
        likes: current.likes + (current.liked ? -1 : 1),
      })),
    onToggleSave: () => onUpdatePost(post.id, (current) => ({ ...current, saved: !current.saved })),
  };
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
  onAddComment: (comment: PostComment) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [burst, setBurst] = useState(0);
  const { currentUser, getUser, getRank, openProfile } = useUsers();
  const { friend, trail } = post;
  // The poster's own ranking, read live so it follows any later re-ranking
  const rank = getRank(friend.id, trail.name);
  const mountainOwner = friend.id === currentUser.id ? "your" : "their";

  const submitComment = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAddComment({ id: `c-${Date.now()}`, authorId: currentUser.id, text });
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
        <button aria-label={`View ${friend.name}'s profile`} className="profile-link" onClick={() => openProfile(friend.id)} type="button">
          <Avatar className="post-avatar" person={friend} />
        </button>
        <div className="post-author">
          <button className="post-author-line profile-link" onClick={() => openProfile(friend.id)} type="button">
            <b>{friend.name}</b>
            <small>@{friend.username}</small>
          </button>
          <span className="post-trail">hiked <strong>{trail.name}</strong></span>
        </div>
        <time className="post-date" dateTime={post.date}>{formatDate(post.date)}</time>
      </header>

      <div className="post-photo" onDoubleClick={likeFromPhoto}>
        <img alt={`${friend.name} on ${trail.name}`} draggable={false} src={post.image} />
        {rank !== null && (
          <span className="post-rank-tag">
            <b>#{rank}</b> on {mountainOwner} mountain
          </span>
        )}
        {burst > 0 && (
          <span className="like-burst" key={burst}>
            <HeartIcon filled />
          </span>
        )}
        <div className="post-stats">
          {trail.distance && <span className="post-stat">{trail.distance}</span>}
          {trail.elevation && <span className="post-stat">↑ {trail.elevation}</span>}
          {trail.difficulty && (
            <span className={`post-stat difficulty-${trail.difficulty.toLowerCase()}`}>{trail.difficulty}</span>
          )}
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
          <button className="profile-link" onClick={() => openProfile(friend.id)} type="button">
            <b>{friend.username}</b>
          </button>
          {post.caption}
        </p>

        {showComments && (
          <div className="post-comments">
            {post.comments.map((comment) => {
              const author = getUser(comment.authorId);
              return (
                <div className="post-comment" key={comment.id}>
                  <button aria-label={`View ${author.name}'s profile`} className="profile-link" onClick={() => openProfile(author.id)} type="button">
                    <Avatar className="comment-avatar" person={author} />
                  </button>
                  <p>
                    <button className="profile-link" onClick={() => openProfile(author.id)} type="button">
                      <b>{author.name}</b>
                    </button>
                    <small>@{author.username}</small>
                    {comment.text}
                  </p>
                </div>
              );
            })}
            {post.comments.length === 0 && <p className="post-comment empty">No comments yet. Say something nice!</p>}
            <form className="comment-form" onSubmit={submitComment}>
              <Avatar className="comment-avatar" person={currentUser} />
              <input
                aria-label="Add a comment"
                autoFocus
                maxLength={200}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Comment as @${currentUser.username}...`}
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
