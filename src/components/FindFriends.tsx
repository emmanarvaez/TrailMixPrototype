import { useEffect, useRef, useState } from "react";
import { searchProfiles } from "../lib/db";
import type { Friend } from "../types";

// Bottom sheet for finding people by name or email and adding them as friends
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
  const [results, setResults] = useState<Friend[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const latestSearch = useRef(0);

  useEffect(() => {
    const searchId = ++latestSearch.current;
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(() => {
      searchProfiles(query, currentUserId)
        .then((found) => {
          if (searchId !== latestSearch.current) return;
          setResults(found);
          setError("");
        })
        .catch((searchError) => {
          if (searchId === latestSearch.current) setError(searchError?.message ?? "Something went wrong.");
        })
        .finally(() => {
          if (searchId === latestSearch.current) setSearching(false);
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, currentUserId]);

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
            aria-label="Search people"
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email..."
            value={query}
          />
        </label>
        <div className="friend-suggestion-list">
          {error && <p className="friend-suggestion-empty" role="alert">Couldn't search: {error}</p>}
          {!error && !query.trim() && <p className="friend-suggestion-empty">Search for someone you hike with.</p>}
          {!error && query.trim() && !searching && results.length === 0 && (
            <p className="friend-suggestion-empty">No people found. Try another search.</p>
          )}
          {results.map((person) => {
            const isFriend = following.includes(person.id);
            return (
              <div className="profile-friend-row" key={person.id}>
                <button className="profile-link profile-friend-person" onClick={() => onOpenProfile(person.id)} type="button">
                  <span className="profile-friend-avatar" style={{ background: person.color }}>
                    {person.avatar ? <img alt="" src={person.avatar} /> : person.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="profile-friend-copy"><b>{person.name}</b><small>@{person.username}</small></span>
                </button>
                <button
                  aria-pressed={isFriend}
                  className={isFriend ? "added" : ""}
                  onClick={() => onToggleFollow(person)}
                  type="button"
                >
                  {isFriend ? "Added" : "Add"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
