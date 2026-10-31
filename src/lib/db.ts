import { supabase } from "./supabase";
import { toTrail } from "./trails";
import { trailPlaceholder } from "./trailArt";
import type { FeedPost, Friend, HikeLog, Media, PostComment } from "../types";

// Everything the app reads from or writes to Supabase for the signed-in user.

const MEDIA_BUCKET = "hike-photos";
export const MAX_MEDIA = 20;

// ─── Profiles ────────────────────────────────────────────────────────────────

// Only public columns: emails and phone numbers are never readable for other users
type ProfileRow = { id: string; name: string; username: string | null; avatar_url: string | null };

const AVATAR_COLORS = ["#244f3b", "#c2571f", "#6d8b68", "#d5a23e", "#7a4e2a", "#e66a3c", "#4b806b", "#71819a"];

// Same color for a person everywhere, picked from their ID
export function colorFor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// ─── Usernames ───────────────────────────────────────────────────────────────

export const USERNAME_RULES = "3–20 characters: lowercase letters, numbers, _ and .";

// What's wrong with a username, or null if its format is fine
export function usernameProblem(username: string): string | null {
  if (username.length < 3) return "Usernames need at least 3 characters.";
  if (username.length > 20) return "Usernames can be at most 20 characters.";
  if (!/^[a-z0-9_.]+$/.test(username)) return "Use only lowercase letters, numbers, _ and .";
  return null;
}

// True if nobody else has it (case-insensitive). Works before signing in, for the sign-up form.
export async function usernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("username_available", { candidate: username });
  if (error) throw error;
  return data === true;
}

export async function setUsername(userId: string, username: string) {
  const { error } = await supabase.from("profiles").update({ username }).eq("id", userId);
  if (error) throw error.code === "23505" ? new Error("That username was just taken. Try another.") : error;
}

// The signed-in user's own profile, including the private fields only they can see
export async function fetchMyProfile(): Promise<{ name: string; username: string | null; avatar_url: string | null; phone: string | null } | null> {
  const { data, error } = await supabase.rpc("get_my_profile");
  if (error) throw error;
  return (data as { name: string; username: string | null; avatar_url: string | null; phone: string | null }[])[0] ?? null;
}

export function toFriend(row: ProfileRow): Friend {
  return {
    id: row.id,
    name: row.name,
    username: row.username ?? "",
    color: colorFor(row.id),
    avatar: row.avatar_url ?? undefined,
  };
}

const PROFILE_COLUMNS = "id, name, username, avatar_url";

export async function fetchProfiles(ids: string[]): Promise<Friend[]> {
  const unique = [...new Set(ids)];
  if (!unique.length) return [];
  const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).in("id", unique);
  if (error) throw error;
  return (data as ProfileRow[]).map(toFriend);
}

// People matching a username or display name (never email). A leading @ is ignored.
export async function searchProfiles(query: string, excludeId: string): Promise<Friend[]> {
  // Characters that would break the "or" filter or act as wildcards are dropped from the search text
  const text = query.trim().replace(/^@+/, "").replace(/[,()%*\\]/g, " ").trim();
  if (!text) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .or(`username.ilike.*${text}*,name.ilike.*${text}*`)
    .neq("id", excludeId)
    .order("name")
    .limit(20);
  if (error) throw error;
  return (data as ProfileRow[]).map(toFriend);
}

export async function updateProfile(userId: string, changes: { phone?: string; avatar_url?: string }) {
  const { error } = await supabase.from("profiles").update(changes).eq("id", userId);
  if (error) throw error;
}

function fileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() || (file.type.startsWith("video/") ? "mp4" : "jpg");
}

async function uploadFile(path: string, file: File): Promise<string> {
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const url = await uploadFile(`${userId}/avatar-${Date.now()}.${fileExtension(file)}`, file);
  await updateProfile(userId, { avatar_url: url });
  return url;
}

// ─── Friends (who the user follows) ──────────────────────────────────────────

export async function fetchFollowing(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("friendships").select("friend_id").eq("user_id", userId);
  if (error) throw error;
  return data.map((row) => row.friend_id as string);
}

// Who follows this user
export async function fetchFollowers(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("friendships").select("user_id").eq("friend_id", userId);
  if (error) throw error;
  return data.map((row) => row.user_id as string);
}

export async function setFollowing(userId: string, friendId: string, follow: boolean) {
  const { error } = follow
    ? await supabase.from("friendships").insert({ user_id: userId, friend_id: friendId })
    : await supabase.from("friendships").delete().eq("user_id", userId).eq("friend_id", friendId);
  if (error) throw error;
}

// ─── Posts (hike logs as the feed shows them) ────────────────────────────────

type PostRow = {
  id: string;
  user_id: string;
  archived_at?: string | null;
  trail_name: string | null;
  date: string;
  caption: string | null;
  trails: Parameters<typeof toTrail>[0] | null;
  log_photos: { url: string; sort_order: number; media_type: "image" | "video" | null }[];
  log_tags: { tag: string }[];
  comments: { id: string; user_id: string; body: string; created_at: string }[];
  likes: { user_id: string }[];
};

const POST_COLUMNS =
  "id, user_id, trail_name, date, caption, created_at, trails(*), log_photos(url, sort_order, media_type), log_tags(tag), comments(id, user_id, body, created_at), likes(user_id)";

// Posts by these users or with these IDs, newest first, plus the profiles of everyone
// who appears in them (authors and commenters) so names and avatars can be shown
export async function fetchPosts(
  viewerId: string,
  filter: { userIds?: string[]; logIds?: string[] },
  limit = 50,
): Promise<{ posts: FeedPost[]; profiles: Friend[] }> {
  const ids = filter.userIds ?? filter.logIds ?? [];
  if (!ids.length) return { posts: [], profiles: [] };
  const query = (columns: string) => {
    const request = supabase.from("hike_logs").select(columns);
    return (filter.userIds ? request.in("user_id", ids) : request.in("id", ids))
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
  };
  let { data, error } = await query(`${POST_COLUMNS}, archived_at`);
  // Before 006_archive.sql is run there's no archived_at column: load posts without it
  if (error?.code === "42703") ({ data, error } = await query(POST_COLUMNS));
  if (error) throw error;
  const rows = data as unknown as PostRow[];

  const [{ data: saved, error: savedError }, profiles] = await Promise.all([
    supabase.from("saved_logs").select("log_id").eq("user_id", viewerId).in("log_id", rows.map((row) => row.id)),
    // Authors, commenters and tagged people, so every @username on the post can be shown
    fetchProfiles(rows.flatMap((row) => [row.user_id, ...row.comments.map((comment) => comment.user_id), ...row.log_tags.map((tag) => tag.tag)])),
  ]);
  if (savedError) throw savedError;
  const savedIds = new Set((saved ?? []).map((row) => row.log_id as string));
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));

  const posts = rows.map((row): FeedPost => {
    const trailName = row.trail_name ?? row.trails?.name ?? "A trail";
    return {
      id: row.id,
      friend: byId.get(row.user_id) ?? { id: row.user_id, name: "TrailMix hiker", username: "", color: colorFor(row.user_id) },
      trail: row.trails ? toTrail(row.trails) : { name: trailName, meta: "", image: trailPlaceholder(trailName), distance: "", elevation: "" },
      media: [...row.log_photos]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((photo): Media => ({ url: photo.url, type: photo.media_type === "video" ? "video" : "image" })),
      caption: row.caption ?? "",
      date: row.date,
      likes: row.likes.length,
      liked: row.likes.some((like) => like.user_id === viewerId),
      saved: savedIds.has(row.id),
      comments: [...row.comments]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((comment): PostComment => ({ id: comment.id, authorId: comment.user_id, text: comment.body })),
      taggedUserIds: row.log_tags.map((tag) => tag.tag),
      archived: !!row.archived_at,
    };
  });
  return { posts, profiles };
}

export async function fetchSavedLogIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("saved_logs").select("log_id").eq("user_id", userId);
  if (error) throw error;
  return data.map((row) => row.log_id as string);
}

// Hikes this user was tagged in by someone else
export async function fetchTaggedLogIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("log_tags").select("log_id").eq("tag", userId);
  if (error) throw error;
  return data.map((row) => row.log_id as string);
}

export async function setLiked(logId: string, userId: string, like: boolean) {
  const { error } = like
    ? await supabase.from("likes").insert({ log_id: logId, user_id: userId })
    : await supabase.from("likes").delete().eq("log_id", logId).eq("user_id", userId);
  if (error) throw error;
}

export async function setSaved(logId: string, userId: string, save: boolean) {
  const { error } = save
    ? await supabase.from("saved_logs").insert({ log_id: logId, user_id: userId })
    : await supabase.from("saved_logs").delete().eq("log_id", logId).eq("user_id", userId);
  if (error) throw error;
}

export async function addComment(logId: string, userId: string, body: string): Promise<PostComment> {
  const { data, error } = await supabase
    .from("comments")
    .insert({ log_id: logId, user_id: userId, body })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string, authorId: userId, text: body };
}

// ─── Mountains (rankings) ────────────────────────────────────────────────────

// Each user's mountain as trail names, #1 first
export async function fetchRankings(userIds: string[]): Promise<Record<string, string[]>> {
  const unique = [...new Set(userIds)];
  const rankings: Record<string, string[]> = Object.fromEntries(unique.map((id) => [id, []]));
  if (!unique.length) return rankings;
  const { data, error } = await supabase
    .from("hike_logs")
    .select("user_id, trail_name, rank")
    .in("user_id", unique)
    .not("rank", "is", null)
    .order("rank");
  if (error) throw error;
  for (const row of data) {
    const list = rankings[row.user_id as string];
    if (row.trail_name && !list.includes(row.trail_name)) list.push(row.trail_name);
  }
  return rankings;
}

type LogRow = {
  id: string;
  trail_name: string | null;
  date: string;
  reaction: string | null;
  difficulty_felt: string | null;
  highlight: string | null;
  caption: string | null;
  rank: number | null;
  trails: { distance: number | string | null } | null;
};

// All of the signed-in user's hikes, best-ranked first, for Accomplishments and their mountain
export async function fetchMyLogs(userId: string): Promise<HikeLog[]> {
  const { data, error } = await supabase
    .from("hike_logs")
    .select("id, trail_name, date, reaction, difficulty_felt, highlight, caption, rank, trails(distance)")
    .eq("user_id", userId)
    .order("rank", { ascending: true, nullsFirst: false })
    .order("date", { ascending: false });
  if (error) throw error;
  return (data as unknown as LogRow[]).map((row) => ({
    id: row.id,
    trailName: row.trail_name ?? "A trail",
    date: row.date,
    reaction: row.reaction ?? "",
    difficulty: row.difficulty_felt ?? "",
    highlights: row.highlight ? row.highlight.split(", ").filter(Boolean) : [],
    caption: row.caption ?? "",
    rank: row.rank,
    miles: parseFloat(String(row.trails?.distance ?? "0").replace(/[^0-9.]/g, "")) || 0,
  }));
}

// Gives each ranked log its place in the new order (trail names, #1 first); a log whose
// trail isn't in the order (an older log of a re-hiked trail) drops off the mountain
function rankUpdates(logs: HikeLog[], order: string[]) {
  return logs
    .filter((log) => log.rank !== null)
    .map((log) => ({ log, rank: order.includes(log.trailName) ? order.indexOf(log.trailName) + 1 : null }))
    .filter(({ log, rank }) => log.rank !== rank);
}

// The user's mountain as trail names, #1 first, from their ranked hike logs
export function rankingFrom(logs: HikeLog[]): string[] {
  return [...new Set(logs.filter((log) => log.rank !== null).sort((a, b) => a.rank! - b.rank!).map((log) => log.trailName))];
}

export async function saveRanking(logs: HikeLog[], order: string[]) {
  const results = await Promise.all(
    rankUpdates(logs, order).map(({ log, rank }) => supabase.from("hike_logs").update({ rank }).eq("id", log.id)),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}

// ─── Ingredients ─────────────────────────────────────────────────────────────

export async function fetchUnlockedIngredients(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("user_ingredients").select("ingredient_key").eq("user_id", userId);
  if (error) throw error;
  return data.map((row) => row.ingredient_key as string);
}

// ─── Logging a hike ──────────────────────────────────────────────────────────

export async function saveHikeLog({
  userId,
  trailId,
  trailName,
  reaction,
  difficulty,
  highlights,
  caption,
  media,
  taggedUserIds,
  order,
  myLogs,
  unlockedIngredient,
}: {
  userId: string;
  trailId?: string;
  trailName: string;
  reaction: string;
  difficulty: string;
  highlights: string[];
  caption: string;
  media: File[];
  taggedUserIds: string[];
  order: string[]; // the user's mountain with this trail placed, #1 first
  myLogs: HikeLog[];
  unlockedIngredient: string | null;
}): Promise<string> {
  const logId = crypto.randomUUID();

  // Upload first so a failed upload leaves nothing half-saved in the database
  const urls = await Promise.all(
    media.map((file, index) => uploadFile(`${userId}/${logId}/${index}-${Date.now()}.${fileExtension(file)}`, file)),
  );

  const now = new Date();
  const { error } = await supabase.from("hike_logs").insert({
    id: logId,
    user_id: userId,
    trail_id: trailId ?? null,
    trail_name: trailName,
    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    reaction,
    difficulty_felt: difficulty,
    highlight: highlights.join(", "),
    caption: caption.trim(),
    rank: order.indexOf(trailName) + 1,
  });
  if (error) throw error;

  const results = await Promise.all([
    ...myLogs
      .filter((log) => log.rank !== null)
      // An older log of this same trail drops off the mountain: the new log takes its place
      .map((log) => ({ log, rank: log.trailName === trailName || !order.includes(log.trailName) ? null : order.indexOf(log.trailName) + 1 }))
      .filter(({ log, rank }) => log.rank !== rank)
      .map(({ log, rank }) => supabase.from("hike_logs").update({ rank }).eq("id", log.id)),
    supabase.from("log_photos").insert(
      urls.map((url, index) => ({
        log_id: logId,
        user_id: userId,
        url,
        sort_order: index,
        media_type: media[index].type.startsWith("video/") ? "video" : "image",
      })),
    ),
    taggedUserIds.length
      ? supabase.from("log_tags").insert(taggedUserIds.map((tag) => ({ log_id: logId, user_id: userId, tag })))
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
  return logId;
}

// ─── Archiving and deleting your own hikes ───────────────────────────────────

export async function setArchived(logId: string, archived: boolean) {
  const { error } = await supabase
    .from("hike_logs")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", logId);
  if (error) {
    throw error.code === "42703" || error.code === "PGRST204"
      ? new Error("Archiving needs 007_archive.sql to be run in Supabase first.")
      : error;
  }
}

// Deletes a hike and everything attached to it (photos, tags, comments, likes and saves
// cascade in the database), removes its files, and closes the gap it leaves on the mountain
export async function deleteHikeLog(userId: string, logId: string) {
  const { data: photos } = await supabase.from("log_photos").select("url").eq("log_id", logId);
  const marker = `/${MEDIA_BUCKET}/`;
  const paths = (photos ?? [])
    .map((photo) => photo.url as string)
    .filter((url) => url.includes(marker))
    .map((url) => decodeURIComponent(url.slice(url.indexOf(marker) + marker.length)));

  const { error } = await supabase.from("hike_logs").delete().eq("id", logId).eq("user_id", userId);
  if (error) throw error;

  if (paths.length) {
    // Best effort: a leftover file shouldn't make the delete look like it failed
    const { error: storageError } = await supabase.storage.from(MEDIA_BUCKET).remove(paths);
    if (storageError) console.error("Couldn't delete hike files", storageError);
  }
  const remaining = await fetchMyLogs(userId);
  await saveRanking(remaining, rankingFrom(remaining));
}
