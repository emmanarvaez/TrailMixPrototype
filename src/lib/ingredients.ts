// What made a hike special (its tag, e.g. "Scenery") and the trail mix ingredient it adds
// to the jar, in unlock order. `shape` is the key saved in user_ingredients; the tag (label)
// is saved in hike_logs.highlight.
export const detailOptions = [
  { label: "Scenery",            ingredient: "Cashews",           shape: "cashews",           icon: "/assets/cashews.svg" },
  { label: "Coastal",            ingredient: "Almonds",           shape: "almonds",           icon: "/assets/almonds.svg" },
  { label: "Rocky",              ingredient: "Pretzels",          shape: "pretzels",          icon: "/assets/pretzel.svg" },
  { label: "Peaceful",           ingredient: "M&Ms",              shape: "mms",               icon: "/assets/chocolate.svg" },
  { label: "Crowded",            ingredient: "Chocolate chips",   shape: "chocolate-chips",   icon: "/assets/chocolate-chips.svg" },
  { label: "Flowery",            ingredient: "Popcorn",           shape: "popcorn",           icon: "/assets/popcorn.svg" },
  { label: "Wildlife encounter", ingredient: "Chex Mix",          shape: "chex-mix",          icon: "/assets/chex.svg" },
  { label: "Canine friendly",    ingredient: "Dried bananas",     shape: "dried-bananas",     icon: "/assets/banana.svg" },
  { label: "Sunrise",            ingredient: "Sunflower seeds",   shape: "sunflower-seeds",   icon: "/assets/sunflower-seeds.svg" },
  { label: "Sunset",             ingredient: "Pumpkin seeds",     shape: "pumpkin-seeds",     icon: "/assets/pumpkin-seeds.svg" },
  { label: "Waterfall",          ingredient: "Dried cranberries", shape: "dried-cranberries", icon: "/assets/cranberries.svg" },
  { label: "River",              ingredient: "Raisins",           shape: "raisins",           icon: "/assets/raisins.svg" },
];

export type IngredientOption = (typeof detailOptions)[number];

// Tags from the old ingredient list, for hikes logged before it changed (supabase/009 rewrites
// them in the database too). Old tags with no close match (Forest, Campfire, Snack Break,
// Shade) aren't listed, so those hikes keep no ingredient.
const OLD_TAGS: Record<string, string> = {
  Views: "Scenery",
  Climb: "Rocky",
  Summit: "Scenery",
  Meadow: "Flowery",
};

/** The ingredient for a tag saved on a hike (current or old), or undefined if it has none. */
export function ingredientForTag(tag: string): IngredientOption | undefined {
  const current = OLD_TAGS[tag] ?? tag;
  return detailOptions.find((option) => option.label === current);
}
