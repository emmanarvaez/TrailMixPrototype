-- TrailMix migration 007: archived hikes are only visible to their owner
-- Run in the Supabase SQL editor (Database → SQL Editor → New query) after 005_friends.sql.
-- Safe to run more than once. (Deleting a hike needs no changes: the existing
-- "Users can delete their own hike logs" policy and cascades already handle it.)

begin;

alter table hike_logs add column if not exists archived_at timestamptz;

-- Everyone signed in can see hikes, except archived ones, which only their owner sees
drop policy if exists "Signed-in users can read hike logs" on hike_logs;
create policy "Signed-in users can read hike logs"
  on hike_logs for select to authenticated
  using (archived_at is null or auth.uid() = user_id);

-- Photos, tags, comments and likes follow their hike: hidden while it's archived.
-- (The subquery goes through hike_logs' own policy above.)
drop policy if exists "Signed-in users can read log photos" on log_photos;
create policy "Signed-in users can read log photos"
  on log_photos for select to authenticated
  using (exists (select 1 from hike_logs h where h.id = log_photos.log_id));

drop policy if exists "Signed-in users can read log tags" on log_tags;
create policy "Signed-in users can read log tags"
  on log_tags for select to authenticated
  using (exists (select 1 from hike_logs h where h.id = log_tags.log_id));

drop policy if exists "Signed-in users can read comments" on comments;
create policy "Signed-in users can read comments"
  on comments for select to authenticated
  using (exists (select 1 from hike_logs h where h.id = comments.log_id));

drop policy if exists "Users can read likes" on likes;
drop policy if exists "Signed-in users can read likes" on likes;
create policy "Signed-in users can read likes"
  on likes for select to authenticated
  using (exists (select 1 from hike_logs h where h.id = likes.log_id));

commit;
