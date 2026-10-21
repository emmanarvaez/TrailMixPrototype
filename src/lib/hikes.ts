import { supabase } from "./supabase";
import { trailPhotos, type Difficulty, type Trail } from "@/data/trails";

const PHOTO_BUCKET = "hike-photos";

type TrailRow = {
  id: string;
  name: string;
  area: string | null;
  distance: number | null;
  elevation: number | null;
  difficulty: Difficulty | null;
  image_url: string | null;
};

type HikeLogRow = {
  id: string;
  trail_id: string | null;
  trail_name: string | null;
  date: string;
  reaction: string | null;
  difficulty_felt: string | null;
  highlight: string | null;
  caption: string | null;
  rank: number | null;
  trails: { distance: number | null } | null;
  log_photos: { url: string; sort_order: number }[];
};

export type HikeLog = {
  id: string;
  trailId: string | null;
  trailName: string;
  date: string; // YYYY-MM-DD
  reaction: string;
  difficulty: string;
  highlights: string[]; // detailOptions labels
  caption: string;
  rank: number;
  miles: number;
  photos: string[];
};

function toTrail(row: TrailRow, index: number): Trail {
  const distance = row.distance != null ? `${row.distance} mi` : "";
  const elevation = row.elevation != null ? `${row.elevation.toLocaleString()} ft` : "";
  const difficulty = row.difficulty ?? "Moderate";
  return {
    id: row.id,
    name: row.name,
    area: row.area ?? undefined,
    distance,
    elevation,
    difficulty,
    image: row.image_url ?? trailPhotos[index % trailPhotos.length],
    meta: [row.area, distance, elevation, difficulty].filter(Boolean).join(" · "),
  };
}

function toHikeLog(row: HikeLogRow, index: number): HikeLog {
  return {
    id: row.id,
    trailId: row.trail_id,
    trailName: row.trail_name ?? "Unnamed trail",
    date: row.date,
    reaction: row.reaction ?? "",
    difficulty: row.difficulty_felt ?? "",
    highlights: row.highlight ? row.highlight.split(", ").filter(Boolean) : [],
    caption: row.caption ?? "",
    rank: row.rank ?? index + 1,
    miles: Number(row.trails?.distance ?? 0),
    photos: [...row.log_photos].sort((a, b) => a.sort_order - b.sort_order).map((photo) => photo.url),
  };
}

export async function fetchTrails(): Promise<Trail[]> {
  const { data, error } = await supabase
    .from("trails")
    .select("id, name, area, distance, elevation, difficulty, image_url")
    .order("name");
  if (error) throw error;
  return (data as TrailRow[]).map(toTrail);
}

// Returned in rank order (#1 first)
export async function fetchHikeLogs(userId: string): Promise<HikeLog[]> {
  const { data, error } = await supabase
    .from("hike_logs")
    .select("id, trail_id, trail_name, date, reaction, difficulty_felt, highlight, caption, rank, trails(distance), log_photos(url, sort_order)")
    .eq("user_id", userId)
    .order("rank", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as unknown as HikeLogRow[]).map(toHikeLog);
}

export async function fetchUnlockedIngredients(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("user_ingredients").select("ingredient_key").eq("user_id", userId);
  if (error) throw error;
  return data.map((row) => row.ingredient_key as string);
}

// Writes rank = position + 1 for every log whose rank changed; returns the logs with updated ranks
export async function saveRanking(ordered: HikeLog[]): Promise<HikeLog[]> {
  const changed = ordered.filter((log, index) => log.rank !== index + 1);
  const results = await Promise.all(
    changed.map((log) => supabase.from("hike_logs").update({ rank: ordered.indexOf(log) + 1 }).eq("id", log.id)),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
  return ordered.map((log, index) => ({ ...log, rank: index + 1 }));
}

// Deletes a hike and everything attached to it (photos, tags, comments, likes cascade in the database),
// then closes the gap it leaves in the user's rankings
export async function deleteHikeLog(userId: string, logId: string): Promise<void> {
  const { data: photos } = await supabase.from("log_photos").select("url").eq("log_id", logId);
  const marker = `/${PHOTO_BUCKET}/`;
  const paths = (photos ?? [])
    .map((photo) => photo.url as string)
    .filter((url) => url.includes(marker))
    .map((url) => decodeURIComponent(url.slice(url.indexOf(marker) + marker.length)));
  if (paths.length) {
    // Best effort: a leftover file shouldn't stop the hike from being deleted
    const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(paths);
    if (error) console.error("Couldn't delete hike photos", error);
  }

  const { error } = await supabase.from("hike_logs").delete().eq("id", logId).eq("user_id", userId);
  if (error) throw error;

  await saveRanking(await fetchHikeLogs(userId));
}

export async function saveHikeLog({
  userId,
  trail,
  date,
  reaction,
  difficulty,
  highlights,
  caption,
  rank,
  reranked,
  photos,
  unlockedIngredient,
}: {
  userId: string;
  trail: Trail;
  date: string;
  reaction: string;
  difficulty: string;
  highlights: string[];
  caption: string;
  rank: number;
  reranked: HikeLog[]; // the user's other logs, in their new order with this hike removed
  photos: File[];
  unlockedIngredient: string | null;
}): Promise<{ logId: string; photoUrls: string[] }> {
  const logId = crypto.randomUUID();

  // Upload photos first so a failed upload leaves nothing half-saved in the database
  const photoUrls = await Promise.all(
    photos.map(async (file, index) => {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${logId}/${index}-${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type });
      if (error) throw error;
      return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
    }),
  );

  const { error: logError } = await supabase.from("hike_logs").insert({
    id: logId,
    user_id: userId,
    trail_id: trail.id ?? null,
    trail_name: trail.name,
    date,
    reaction,
    difficulty_felt: difficulty,
    highlight: highlights.join(", "),
    caption: caption.trim(),
    rank,
  });
  if (logError) throw logError;

  // Existing logs at or below the new hike shift down by one
  const withNewRanks = reranked.map((log, index) => ({ ...log, rank: index < rank - 1 ? index + 1 : index + 2 }));
  const rankUpdates = withNewRanks
    .filter((log, index) => log.rank !== reranked[index].rank)
    .map((log) => supabase.from("hike_logs").update({ rank: log.rank }).eq("id", log.id));

  const results = await Promise.all([
    ...rankUpdates,
    photoUrls.length
      ? supabase.from("log_photos").insert(photoUrls.map((url, index) => ({ log_id: logId, user_id: userId, url, sort_order: index })))
      : null,
    unlockedIngredient
      ? supabase.from("user_ingredients").upsert(
          { user_id: userId, ingredient_key: unlockedIngredient },
          { onConflict: "user_id,ingredient_key", ignoreDuplicates: true },
        )
      : null,
  ]);
  const failed = results.find((result) => result?.error);
  if (failed?.error) throw failed.error;

  return { logId, photoUrls };
}
