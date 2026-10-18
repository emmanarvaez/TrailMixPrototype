export type Difficulty = "Easy" | "Moderate" | "Hard";

export type Trail = {
  name: string;
  meta: string;
  image: string;
  distance: string;
  elevation: string;
  difficulty: Difficulty;
};

export const trailPhotos = [
  "https://images.unsplash.com/photo-1642746194421-8a5e8eabf323?auto=format&fit=crop&w=900&q=88",
  "https://images.unsplash.com/photo-1603642696724-f522cbcca174?auto=format&fit=crop&w=900&q=88",
  "https://images.unsplash.com/photo-1605068533794-cd164042be22?auto=format&fit=crop&w=900&q=88",
  "https://images.unsplash.com/photo-1579912583830-cfec19b43150?auto=format&fit=crop&w=900&q=88",
];

const trailInfo: Omit<Trail, "meta">[] = [
  { name: "Bommer Canyon Loop", distance: "4.2 mi", elevation: "560 ft", difficulty: "Moderate", image: trailPhotos[0] },
  { name: "Top of the World", distance: "2.4 mi", elevation: "510 ft", difficulty: "Moderate", image: trailPhotos[1] },
  { name: "Holy Jim Falls", distance: "2.8 mi", elevation: "650 ft", difficulty: "Moderate", image: trailPhotos[2] },
  { name: "Crystal Cove Moro Ridge", distance: "5.0 mi", elevation: "820 ft", difficulty: "Hard", image: trailPhotos[3] },
];

export const trails: Trail[] = trailInfo.map((trail) => ({
  ...trail,
  meta: `${trail.distance} · ${trail.elevation} · ${trail.difficulty}`,
}));

export function findTrail(name: string): Trail {
  const trail = trails.find((item) => item.name === name);
  if (!trail) throw new Error(`Unknown trail: ${name}`);
  return trail;
}
