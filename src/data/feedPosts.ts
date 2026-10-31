import { findTrail, trailPhotos, type Trail } from "./trails";

export type Friend = {
  id: string;
  name: string;
  username: string;
  color: string;
  avatar?: string; // image URL or data URL; falls back to the initial on `color`
};

// Comments reference their author by user ID, and the name/avatar are looked up
// when rendering, so each comment always stays tied to the person who wrote it.
export type PostComment = {
  id: string;
  authorId: string;
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

export const friends: Record<string, Friend> = {
  caine: { id: "mock-caine", name: "Caine", username: "caine.climbs", color: "#244f3b" },
  kaylee: { id: "mock-kaylee", name: "Kaylee", username: "kayleeq", color: "#c2571f" },
  oscar: { id: "mock-oscar", name: "Oscar", username: "oscar_outside", color: "#6d8b68" },
  amanda: { id: "mock-amanda", name: "Amanda", username: "amanda.trails", color: "#d5a23e" },
  emma: { id: "mock-emma", name: "Emma", username: "emma.wanders", color: "#7a4e2a" },
};

// Each mock user's personal mountain, #1 first, keyed by user ID
export const mockRankings: Record<string, string[]> = {
  [friends.caine.id]: ["Top of the World", "Crystal Cove Moro Ridge", "Holy Jim Falls", "Bommer Canyon Loop", "Peters Canyon Loop", "Black Star Canyon"],
  [friends.kaylee.id]: ["Holy Jim Falls", "Black Star Canyon", "Top of the World", "Laguna Coast Loop", "Bommer Canyon Loop"],
  [friends.oscar.id]: ["Crystal Cove Moro Ridge", "Red Rock Canyon", "Santiago Oaks", "Top of the World", "Holy Jim Falls", "Moro Canyon Trail", "Quail Hill Trail"],
  [friends.amanda.id]: ["Bommer Canyon Loop", "Quail Hill Trail", "Top of the World", "Buck Gully Trail"],
  [friends.emma.id]: ["Top of the World", "Bommer Canyon Loop", "Peters Canyon Loop"],
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
      { id: "c-1", authorId: friends.emma.id, text: "No way, it's never running when I go 😭" },
      { id: "c-2", authorId: friends.caine.id, text: "Adding this to the list for next weekend" },
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
    comments: [{ id: "c-3", authorId: friends.amanda.id, text: "Golden hour king 👑" }],
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
      { id: "c-4", authorId: friends.kaylee.id, text: "That last climb is brutal" },
      { id: "c-5", authorId: friends.oscar.id, text: "@kayleeq brutal is an understatement" },
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
    comments: [{ id: "c-6", authorId: friends.caine.id, text: "Welcome back!! 🙌" }],
  },
  {
    id: "post-6",
    friend: friends.caine,
    trail: findTrail("Crystal Cove Moro Ridge"),
    image: trailPhotos[3],
    caption: "Ridge run with the fog rolling in. Couldn't see the ocean but the vibes were immaculate.",
    date: "2026-09-27",
    likes: 33,
    liked: false,
    saved: false,
    comments: [],
  },
  {
    id: "post-7",
    friend: friends.kaylee,
    trail: findTrail("Top of the World"),
    image: trailPhotos[1],
    caption: "Quick after-work climb. Laguna was glowing.",
    date: "2026-09-21",
    likes: 29,
    liked: false,
    saved: false,
    comments: [{ id: "c-7", authorId: friends.amanda.id, text: "Take me next time!!" }],
  },
  {
    id: "post-8",
    friend: friends.oscar,
    trail: findTrail("Holy Jim Falls"),
    image: trailPhotos[2],
    caption: "Creek crossings: 9. Dry socks: 0.",
    date: "2026-09-14",
    likes: 40,
    liked: false,
    saved: false,
    comments: [],
  },
  {
    id: "post-9",
    friend: friends.amanda,
    trail: findTrail("Top of the World"),
    image: trailPhotos[1],
    caption: "Brought the whole crew up for sunset. Worth the switchbacks.",
    date: "2026-09-10",
    likes: 46,
    liked: false,
    saved: false,
    comments: [],
  },
  {
    id: "post-10",
    friend: friends.emma,
    trail: findTrail("Bommer Canyon Loop"),
    image: trailPhotos[0],
    caption: "Shady and easy, exactly what I needed today.",
    date: "2026-09-06",
    likes: 22,
    liked: false,
    saved: false,
    comments: [],
  },
];
