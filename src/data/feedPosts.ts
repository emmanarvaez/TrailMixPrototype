import { findTrail, trailPhotos, type Trail } from "./trails";

export type Friend = {
  name: string;
  username: string;
  color: string;
};

export type PostComment = {
  id: string;
  author: Friend;
  text: string;
};

// Shaped so a logged hike (trail + photo + caption + date) can later be
// turned into a post without changing the Feed or HikePost components.
export type FeedPost = {
  id: string;
  friend: Friend;
  trail: Trail;
  image: string;
  caption: string;
  date: string; // ISO date, e.g. "2026-10-12"
  likes: number;
  liked: boolean;
  saved: boolean;
  comments: PostComment[];
  taggedUsers?: string[];
};

export const currentUser: Friend = { name: "Alex", username: "alex.hikes", color: "#e66a3c" };

export const friends: Record<string, Friend> = {
  caine: { name: "Caine", username: "caine.climbs", color: "#244f3b" },
  kaylee: { name: "Kaylee", username: "kayleeq", color: "#c2571f" },
  oscar: { name: "Oscar", username: "oscar_outside", color: "#6d8b68" },
  amanda: { name: "Amanda", username: "amanda.trails", color: "#d5a23e" },
  emma: { name: "Emma", username: "emma.wanders", color: "#7a4e2a" },
};

export const initialFeedPosts: FeedPost[] = [
  {
    id: "post-1",
    friend: friends.kaylee,
    trail: findTrail("Holy Jim Falls"),
    image: trailPhotos[2],
    caption: "The falls were actually flowing this week!! Worth every single creek crossing 💦",
    date: "2026-10-12",
    likes: 42,
    liked: false,
    saved: false,
    taggedUsers: ["alex", "alex.hikes"],
    comments: [
      { id: "c-1", author: friends.emma, text: "No way, it's never running when I go 😭" },
      { id: "c-2", author: friends.caine, text: "Adding this to the list for next weekend" },
    ],
  },
  {
    id: "post-2",
    friend: friends.caine,
    trail: findTrail("Top of the World"),
    image: trailPhotos[1],
    caption: "Sunset laps up here never get old. Catalina was out in full view tonight.",
    date: "2026-10-11",
    likes: 37,
    liked: false,
    saved: false,
    taggedUsers: ["alex", "alex.hikes"],
    comments: [{ id: "c-3", author: friends.amanda, text: "Golden hour king 👑" }],
  },
  {
    id: "post-3",
    friend: friends.oscar,
    trail: findTrail("Crystal Cove Moro Ridge"),
    image: trailPhotos[3],
    caption: "Legs are toast but the ocean views along the ridge made up for it. Bring more water than you think.",
    date: "2026-10-09",
    likes: 28,
    liked: false,
    saved: false,
    comments: [
      { id: "c-4", author: friends.kaylee, text: "That last climb is brutal" },
      { id: "c-5", author: friends.oscar, text: "@kayleeq brutal is an understatement" },
    ],
  },
  {
    id: "post-4",
    friend: friends.amanda,
    trail: findTrail("Bommer Canyon Loop"),
    image: trailPhotos[0],
    caption: "Easy morning loop before work. Spotted two deer and one very confident rabbit 🐇",
    date: "2026-10-07",
    likes: 51,
    liked: false,
    saved: false,
    comments: [],
  },
  {
    id: "post-5",
    friend: friends.emma,
    trail: findTrail("Top of the World"),
    image: trailPhotos[1],
    caption: "First hike back after a long break. Slow and steady, still made it to the top!",
    date: "2026-10-04",
    likes: 64,
    liked: false,
    saved: false,
    comments: [{ id: "c-6", author: friends.caine, text: "Welcome back!! 🙌" }],
  },
];
