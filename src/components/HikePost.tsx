import { useRef, useState, type FormEvent } from "react";
import { usePosts } from "../context/PostsContext";
import { handle, useUsers } from "../context/UsersContext";
import type { FeedPost, Friend, Media } from "../types";

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

// Swipeable photos/videos: native horizontal scrolling that snaps to each item, with dots
// and a "2/5" counter. Arrow buttons appear on wider screens where swiping isn't natural.
function MediaCarousel({ media, label }: { media: Media[]; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const scrollTo = (next: number) => {
    const element = track.current;
    if (element) element.scrollTo({ left: next * element.clientWidth, behavior: "smooth" });
  };
  return (
    <>
      <div
        aria-label={media.length > 1 ? `${label}, ${media.length} photos and videos` : label}
        className="post-media-track"
        onScroll={(event) => {
          const element = event.currentTarget;
          setIndex(Math.round(element.scrollLeft / element.clientWidth));
        }}
        ref={track}
        role="group"
      >
        {media.map((item, i) =>
          item.type === "video" ? (
            <video className="post-media-item" controls key={item.url} playsInline preload="metadata" src={item.url} />
          ) : (
            <img alt={i === 0 ? label : ""} className="post-media-item" draggable={false} key={item.url} src={item.url} />
          ),
        )}
      </div>
      {media.length > 1 && (
        <>
          <span className="post-media-count">{index + 1}/{media.length}</span>
          {index > 0 && (
            <button aria-label="Previous photo" className="post-media-arrow prev" onClick={() => scrollTo(index - 1)} type="button">‹</button>
          )}
          {index < media.length - 1 && (
            <button aria-label="Next photo" className="post-media-arrow next" onClick={() => scrollTo(index + 1)} type="button">›</button>
          )}
          <div aria-hidden="true" className="post-media-dots">
            {media.map((item, i) => <span className={i === index ? "active" : ""} key={item.url} />)}
          </div>
        </>
      )}
    </>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function plural(count: number, word: string) {
  return `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;
}

export default function HikePost({ post }: { post: FeedPost }) {
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [burst, setBurst] = useState(0);
  const [commentError, setCommentError] = useState("");
  const { currentUser, users, getUser, getRank, openProfile } = useUsers();
  const { toggleLike, toggleSave, addComment } = usePosts();
  const onToggleLike = () => toggleLike(post.id);
  const { trail } = post;
  // The author's latest profile, so a changed username or photo shows on older posts too
  const friend = users[post.friend.id] ?? post.friend;
  // The poster's own ranking, read live so it follows any later re-ranking
  const rank = getRank(friend.id, trail.name);
  const mountainOwner = friend.id === currentUser.id ? "your" : "their";

  const submitComment = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setCommentError("");
    addComment(post.id, text).catch((error) => {
      console.error("Couldn't post comment", error);
      setDraft(text);
      setCommentError("Couldn't post your comment. Try again?");
    });
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
            {handle(friend) && <small>{handle(friend)}</small>}
          </button>
          <span className="post-trail">hiked <strong>{trail.name}</strong></span>
        </div>
        <time className="post-date" dateTime={post.date}>{formatDate(post.date)}</time>
      </header>

      <div className="post-photo" onDoubleClick={likeFromPhoto}>
        <MediaCarousel label={`${friend.name} on ${trail.name}`} media={post.media} />
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
          onClick={() => toggleSave(post.id)}
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
            <b>{friend.username || friend.name}</b>
          </button>
          {/* Just the username when there's no caption; nothing is made up */}
          {post.caption}
        </p>
        {post.taggedUserIds.length > 0 && (
          <p className="post-tagged">
            with{" "}
            {post.taggedUserIds.map((id, index) => {
              const person = getUser(id);
              return (
                <span key={id}>
                  {index > 0 && ", "}
                  <button className="profile-link post-tag-link" onClick={() => openProfile(id)} type="button">
                    {handle(person) || person.name}
                  </button>
                </span>
              );
            })}
          </p>
        )}

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
                    {handle(author) && <small>{handle(author)}</small>}
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
                placeholder={`Comment as ${handle(currentUser) || currentUser.name}...`}
                value={draft}
              />
              <button disabled={!draft.trim()} type="submit">Post</button>
            </form>
            {commentError && <p className="post-comment empty" role="alert">{commentError}</p>}
          </div>
        )}
      </div>
    </article>
  );
}
