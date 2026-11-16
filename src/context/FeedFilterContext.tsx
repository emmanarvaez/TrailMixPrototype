import { createContext, useContext } from "react";

// The Feed's ingredient filters (detailOptions labels, e.g. "Waterfall"). Kept in App so an
// ingredient tag tapped on any post, not just on the Feed, can filter the Feed.
type FeedFilterValue = {
  filters: string[];
  /** Adds a filter and shows the Feed, e.g. after tapping an ingredient tag on a post. */
  addFilter: (label: string) => void;
  toggleFilter: (label: string) => void;
  clearFilters: () => void;
};

export const FeedFilterContext = createContext<FeedFilterValue | null>(null);

export function useFeedFilters() {
  const value = useContext(FeedFilterContext);
  if (!value) throw new Error("useFeedFilters must be used inside FeedFilterContext");
  return value;
}

/** A post matches when it has ANY of the selected ingredients; no filters matches everything. */
export const matchesFilters = (ingredientTags: string[], filters: string[]) =>
  filters.length === 0 || ingredientTags.some((tag) => filters.includes(tag));
