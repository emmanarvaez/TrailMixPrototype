import { createContext, useCallback, useContext, useState } from "react";
import { addComment as insertComment, fetchPosts, setLiked, setSaved } from "../lib/db";
import type { FeedPost, Friend } from "../types";

// One shared copy of every post loaded so far, so a like on the feed shows on the profile too.
// Likes, saves and comments update on screen straight away and are saved to Supabase behind
// the scenes; if saving fails the change is undone.

type PostsContextValue = {
  posts: Record<string, FeedPost>;
  /** Loads posts by these users or with these IDs and returns their IDs, newest first. */
  loadPosts: (filter: { userIds?: string[]; logIds?: string[] }) => Promise<string[]>;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  addComment: (id: string, text: string) => Promise<void>;
};

export const PostsContext = createContext<PostsContextValue | null>(null);

export function usePosts() {
  const value = useContext(PostsContext);
  if (!value) throw new Error("usePosts must be used inside PostsContext");
  return value;
}

export function usePostsStore(userId: string | null, addProfiles: (profiles: Friend[]) => void) {
  const [posts, setPosts] = useState<Record<string, FeedPost>>({});

  const update = (id: string, change: (post: FeedPost) => FeedPost) =>
    setPosts((current) => (current[id] ? { ...current, [id]: change(current[id]) } : current));

  const loadPosts = useCallback(
    async (filter: { userIds?: string[]; logIds?: string[] }) => {
      if (!userId) return [];
      const { posts: found, profiles } = await fetchPosts(userId, filter);
      addProfiles(profiles);
      setPosts((current) => ({ ...current, ...Object.fromEntries(found.map((post) => [post.id, post])) }));
      return found.map((post) => post.id);
    },
    [userId, addProfiles],
  );

  const toggleLike = (id: string) => {
    const post = posts[id];
    if (!post || !userId) return;
    const flip = (current: FeedPost) => ({ ...current, liked: !current.liked, likes: current.likes + (current.liked ? -1 : 1) });
    update(id, flip);
    setLiked(id, userId, !post.liked).catch((error) => {
      console.error("Couldn't save like", error);
      update(id, flip);
    });
  };

  const toggleSave = (id: string) => {
    const post = posts[id];
    if (!post || !userId) return;
    const flip = (current: FeedPost) => ({ ...current, saved: !current.saved });
    update(id, flip);
    setSaved(id, userId, !post.saved).catch((error) => {
      console.error("Couldn't save bookmark", error);
      update(id, flip);
    });
  };

  const addComment = async (id: string, text: string) => {
    if (!userId) return;
    const comment = await insertComment(id, userId, text);
    update(id, (current) => ({ ...current, comments: [...current.comments, comment] }));
  };

  const reset = useCallback(() => setPosts({}), []);

  return { value: { posts, loadPosts, toggleLike, toggleSave, addComment }, reset };
}
