// Shared shapes for data loaded from Supabase

export type Difficulty = "Easy" | "Moderate" | "Hard";

export type Trail = {
  id?: string; // set for trails loaded from Supabase
  name: string;
  area?: string;
  meta: string;
  image: string;
  distance: string; // "" when unknown
  elevation: string; // "" when unknown (OSM trails have no elevation data)
  difficulty?: Difficulty;
};

export type Friend = {
  id: string;
  name: string;
  username: string;
  color: string;
  avatar?: string; // image URL; falls back to the initial on `color`
};

// Comments reference their author by user ID, and the name/avatar are looked up
// when rendering, so each comment always stays tied to the person who wrote it.
export type PostComment = {
  id: string;
  authorId: string;
  text: string;
};

export type Media = { url: string; type: "image" | "video" };

// One logged hike as it appears on the feed and profiles
export type FeedPost = {
  id: string; // hike_logs.id
  friend: Friend; // who posted it
  trail: Trail;
  media: Media[]; // at least one photo or video, in the order they were added
  caption: string; // "" when the user didn't write one
  date: string; // ISO date, e.g. "2026-10-12"
  likes: number;
  liked: boolean;
  saved: boolean;
  comments: PostComment[];
  taggedUserIds: string[];
  archived: boolean; // archived posts are hidden from everyone but their owner
};


// One of the signed-in user's own hike logs, for Accomplishments and their mountain
export type HikeLog = {
  id: string;
  trailName: string;
  date: string;
  reaction: string;
  difficulty: string;
  highlights: string[]; // "What made this one?" labels, e.g. "Views"
  caption: string;
  rank: number | null; // place on their mountain; null once a newer log of the same trail replaces it
  miles: number;
};

// One row of the notifications table, with what's needed to show it
export type AppNotification = {
  id: string;
  type: "follow" | "like" | "comment" | "tag" | "reply";
  actorId: string;
  logId: string | null;
  commentId: string | null;
  trailName: string | null;
  thumbnail: Media | null; // first photo/video of the hike
  commentText: string | null;
  read: boolean;
  createdAt: string;
};

