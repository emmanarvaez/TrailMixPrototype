import { useState } from "react";
import PeopleList from "./PeopleList";
import { usePeopleSearch } from "./usePeopleSearch";
import type { Friend } from "../types";

// Bottom sheet for finding people by username or name and following them
export default function FindFriends({
  currentUserId,
  following,
  onToggleFollow,
  onOpenProfile,
  onClose,
}: {
  currentUserId: string;
  following: string[];
  onToggleFollow: (person: Friend) => void;
  onOpenProfile: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const { results, searching, error } = usePeopleSearch(query, currentUserId);

  return (
    <div className="friend-sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section aria-labelledby="friend-sheet-title" aria-modal="true" className="friend-sheet" role="dialog">
        <header>
          <div><span className="eyebrow">Find your people</span><h2 id="friend-sheet-title">Add friends</h2></div>
          <button aria-label="Close add friends" className="friend-sheet-close" onClick={onClose} type="button">×</button>
        </header>
        <label className="friend-search-field">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Search for friends"
            autoCapitalize="none"
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for friends..."
            value={query}
          />
        </label>
        <div className="friend-suggestion-list">
          {error && <p className="friend-suggestion-empty" role="alert">Couldn't search: {error}</p>}
          {!error && !query.trim() && <p className="friend-suggestion-empty">Search by username or name.</p>}
          {!error && query.trim() && !searching && results.length === 0 && (
            <p className="friend-suggestion-empty">No one found with that username.</p>
          )}
          <PeopleList
            currentUserId={currentUserId}
            following={following}
            onOpenProfile={onOpenProfile}
            onToggleFollow={onToggleFollow}
            people={results}
          />
        </div>
      </section>
    </div>
  );
}
