import { createContext, useContext } from "react";
import type { AuthUser } from "../components/Authpage";
import { colorFor } from "../lib/db";
import type { Friend } from "../types";

// The signed-in account as a public profile, the same shape used for friends,
// post authors and comment authors.
export function profileFromAuth(user: AuthUser): Friend {
  return {
    id: user.id,
    name: user.name,
    username: user.username ?? "",
    color: colorFor(user.id),
    avatar: user.avatar,
  };
}

// "@username" for display, or "" for an account that hasn't picked one yet. Never the email.
export const handle = (person: Friend) => (person.username ? `@${person.username}` : "");

type UsersContextValue = {
  /** The signed-in user's profile; new comments are written as this user. */
  currentUser: Friend;
  /** Every profile loaded so far, by user ID, used to resolve post and comment authors. */
  users: Record<string, Friend>;
  /** Opens a user's profile; the signed-in user's own ID goes to the Profile tab. */
  openProfile: (id: string) => void;
  /** Each loaded user's mountain by user ID, #1 first (trail names). */
  rankings: Record<string, string[]>;
};

export const UsersContext = createContext<UsersContextValue | null>(null);

export function useUsers() {
  const value = useContext(UsersContext);
  if (!value) throw new Error("useUsers must be used inside UsersContext");
  const getUser = (id: string): Friend =>
    value.users[id] ?? { id, name: "TrailMix hiker", username: "", color: colorFor(id) };
  // Where a user placed a trail on their own mountain (1 = summit), or null if it isn't ranked
  const getRank = (userId: string, trailName: string): number | null => {
    const index = value.rankings[userId]?.indexOf(trailName) ?? -1;
    return index === -1 ? null : index + 1;
  };
  return { ...value, getUser, getRank };
}
