import { useEffect, useRef, useState } from "react";
import HikePost from "./HikePost";
import Leaderboard from "./Leaderboard";
import { matchesFilters, useFeedFilters } from "../context/FeedFilterContext";
import { detailOptions, ingredientForTag } from "../lib/ingredients";
import type { FeedPost } from "../types";

function SlidersIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 6h11M18 6h3M3 12h3M10 12h11M3 18h13M20 18h1" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

// Filter button with a popover of every ingredient (multi-select), for finding hikes by
// what made them special. Choices come from detailOptions, the same list used to log hikes.
function IngredientFilterButton() {
  const { filters, toggleFilter, clearFilters } = useFeedFilters();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  // Close when tapping outside or pressing Escape
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="feed-filter" ref={wrapper}>
      <button
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={filters.length ? `Filter by ingredient, ${filters.length} selected` : "Filter by ingredient"}
        className={`feed-filter-button ${filters.length ? "active" : ""}`}
        onClick={() => setOpen(!open)}
        type="button"
      >
        <SlidersIcon />
        {filters.length > 0 && <span className="feed-filter-count">{filters.length}</span>}
      </button>
      {open && (
        <div aria-label="Filter hikes by ingredient" className="feed-filter-popover" role="group">
          <div className="feed-filter-popover-head">
            <b>Filter by ingredient</b>
            {filters.length > 0 && <button onClick={clearFilters} type="button">Clear filters</button>}
          </div>
          <div className="feed-filter-options">
            {detailOptions.map((option) => {
              const active = filters.includes(option.label);
              return (
                <button
                  aria-pressed={active}
                  className={`feed-filter-option ${active ? "active" : ""}`}
                  key={option.label}
                  onClick={() => toggleFilter(option.label)}
                  type="button"
                >
                  <img alt="" src={option.icon} />
                  <span><b>{option.label}</b><small>{option.ingredient}</small></span>
                  <i aria-hidden="true">{active ? "✓" : ""}</i>
                </button>
              );
            })}
          </div>
          <button className="feed-filter-done" onClick={() => setOpen(false)} type="button">Done</button>
        </div>
      )}
    </div>
  );
}

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
  const { filters, toggleFilter, clearFilters } = useFeedFilters();
  // A filter added from a post's ingredient tag always shows the hikes, not the Leaderboard
  const filterCount = filters.length;
  useEffect(() => {
    if (filterCount > 0) setView("feed");
  }, [filterCount]);
  // Archived posts only appear in their owner's Archived list
  const visible = (posts ?? []).filter((post) => !post.archived);
  // Ingredient filters only narrow the hikes already in the feed (you and your friends)
  const shown = visible.filter((post) => matchesFilters(post.ingredientTags, filters));

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
          <div className="section-heading feed-heading">
            <h2>{filters.length ? "Matching hikes" : "From your trail crew"}</h2>
            <span>{shown.length} {shown.length === 1 ? "hike" : "hikes"}</span>
            <IngredientFilterButton />
          </div>
          {filters.length > 0 && (
            <div aria-label="Active filters" className="feed-active-filters">
              {filters.map((label) => {
                const option = ingredientForTag(label);
                return (
                  <button aria-label={`Remove ${label} filter`} className="feed-active-filter" key={label} onClick={() => toggleFilter(label)} type="button">
                    {option && <img alt="" src={option.icon} />}
                    {label}
                    <span aria-hidden="true">×</span>
                  </button>
                );
              })}
              <button className="feed-clear-filters" onClick={clearFilters} type="button">Clear filters</button>
            </div>
          )}
          {loadError && <p className="trail-search-note" role="alert">Couldn't load the feed: {loadError}</p>}
          {!loadError && posts === null && <p className="trail-search-note">Loading hikes…</p>}
          {posts !== null && filters.length > 0 && shown.length === 0 ? (
            <div className="feed-empty feed-filter-empty">
              <img alt="" src="/assets/cashew-05-thinking.svg" />
              <h2>No hikes found with these ingredients!</h2>
              <p>Try another ingredient, or clear your filters to see every hike from your crew.</p>
              <button onClick={clearFilters} type="button">Clear filters</button>
            </div>
          ) : (
            <div className="feed-list">
              {shown.map((post) => <HikePost key={post.id} post={post} />)}
            </div>
          )}
        </>
      )}
    </section>
  );
}
