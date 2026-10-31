import { supabase } from "./supabase";
import { trailPlaceholder } from "./trailArt";
import type { Difficulty, Trail } from "../types";

// Columns can be numbers or (before 002_save_hikes.sql) text like "4.2 mi", so read both
type TrailRow = {
  id: string;
  name: string;
  area?: string | null;
  distance: number | string | null;
  elevation: number | string | null;
  difficulty: Difficulty | null;
  image_url: string | null;
};

const SEARCH_LIMIT = 20;

function toNumber(value: number | string | null): number | null {
  if (value == null) return null;
  const number = typeof value === "number" ? value : parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(number) ? number : null;
}

export function toTrail(row: TrailRow): Trail {
  const miles = toNumber(row.distance);
  const feet = toNumber(row.elevation);
  const distance = miles != null ? `${miles} mi` : "";
  const elevation = feet != null ? `${Math.round(feet).toLocaleString()} ft` : "";
  const difficulty = row.difficulty ?? undefined;
  return {
    id: row.id,
    name: row.name,
    area: row.area ?? undefined,
    distance,
    elevation,
    difficulty,
    image: row.image_url || trailPlaceholder(row.name),
    meta: [row.area, distance, elevation, difficulty].filter(Boolean).join(" · "),
  };
}

// Trails whose name contains the query, at most 20. With no query, trails that have a photo
// (the hand-picked ones) come first so the list isn't just the alphabet's first 20.
export async function searchTrails(query: string): Promise<Trail[]> {
  const text = query.trim();
  let request = supabase.from("trails").select("*").limit(SEARCH_LIMIT);
  if (text) {
    const pattern = text.replace(/[\\%_]/g, (char) => `\\${char}`);
    request = request.ilike("name", `%${pattern}%`).order("name");
  } else {
    request = request.order("image_url", { ascending: true, nullsFirst: false }).order("name");
  }
  const { data, error } = await request;
  if (error) throw error;
  const trails = (data as TrailRow[]).map(toTrail);
  // Names that start with the query read as better matches, so list them first
  const lower = text.toLowerCase();
  return lower ? trails.sort((a, b) => Number(!a.name.toLowerCase().startsWith(lower)) - Number(!b.name.toLowerCase().startsWith(lower))) : trails;
}
