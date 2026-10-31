import { createContext, useContext } from "react";
import type { AuthUser } from "../components/Authpage";
import type { Friend } from "../data/feedPosts";

export const DEFAULT_AVATAR_COLOR = "#e66a3c";

export function usernameFor(user: AuthUser) {
  return user.email.split("@")[0].toLowerCase();
}

// The signed-in account as a public profile, the same shape used for friends,
// post authors and comment authors.
export function profileFromAuth(user: AuthUser): Friend {
  return {
    id: user.id,
    name: user.name,
    username: usernameFor(user),
    color: DEFAULT_AVATAR_COLOR,
    avatar: user.avatar,
  };
}

type UsersContextValue = {
  /** The signed-in user's profile; new comments are written as this user. */
  currentUser: Friend;
  /** Every known profile by user ID, used to resolve comment authors. */
  users: Record<string, Friend>;
  /** Opens a user's profile; the signed-in user's own ID goes to the Profile tab. */
  openProfile: (id: string) => void;
};

export const UsersContext = createContext<UsersContextValue | null>(null);

export function useUsers() {
  const value = useContext(UsersContext);
  if (!value) throw new Error("useUsers must be used inside UsersContext");
  const getUser = (id: string): Friend =>
    value.users[id] ?? { id, name: "TrailMix hiker", username: "hiker", color: "#9ba196" };
  return { ...value, getUser };
}
