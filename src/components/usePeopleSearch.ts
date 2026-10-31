import { useEffect, useRef, useState } from "react";
import { searchProfiles } from "../lib/db";
import type { Friend } from "../types";

// Searches people by username or name as the query changes, ignoring stale responses
export function usePeopleSearch(query: string, currentUserId: string) {
  const [results, setResults] = useState<Friend[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const latestSearch = useRef(0);

  useEffect(() => {
    const searchId = ++latestSearch.current;
    if (!query.trim().replace(/^@+/, "")) {
      setResults([]);
      setSearching(false);
      setError("");
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

  return { results, searching, error };
}
