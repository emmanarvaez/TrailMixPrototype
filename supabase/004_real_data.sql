-- TrailMix migration 004: everything the app needs to run on real data instead of mock data
-- Run in the Supabase SQL editor (Database → SQL Editor → New query) after schema.sql.
-- Works whether or not 002/003 were run, and is safe to run more than once.

begin;

-- ─── profiles: remembered tour flag (also in 003_has_onboarded.sql) ──────────
alter table profiles add column if not exists has_onboarded boolean not null default false;

-- ─── hike_logs: match the app's Easy / Moderate / Tough slider (also in 002) ──
alter table hike_logs drop constraint if exists hike_logs_difficulty_felt_check;
alter table hike_logs
  add constraint hike_logs_difficulty_felt_check
  check (difficulty_felt in ('Easy', 'Moderate', 'Tough'));

-- ─── log_photos: posts can have videos as well as photos ────────────────────
alter table log_photos add column if not exists media_type text not null default 'image';
alter table log_photos drop constraint if exists log_photos_media_type_check;
alter table log_photos add constraint log_photos_media_type_check check (media_type in ('image', 'video'));

-- ─── saved_logs: hikes a user bookmarked (the Saved tab on their profile) ────
create table if not exists saved_logs (
  user_id     uuid not null references profiles(id) on delete cascade,
  log_id      uuid not null references hike_logs(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, log_id)
);
alter table saved_logs enable row level security;

drop policy if exists "Users can read their own saved hikes" on saved_logs;
create policy "Users can read their own saved hikes"
  on saved_logs for select using (auth.uid() = user_id);
drop policy if exists "Users can save hikes" on saved_logs;
create policy "Users can save hikes"
  on saved_logs for insert with check (auth.uid() = user_id);
drop policy if exists "Users can unsave hikes" on saved_logs;
create policy "Users can unsave hikes"
  on saved_logs for delete using (auth.uid() = user_id);

-- ─── Visibility: signed-in users can see each other's hikes ─────────────────
-- Needed for the feed, other people's profiles and their mountain rankings.
-- Writing is still limited to your own rows by the existing insert/update/delete policies.

drop policy if exists "Users can read their own hike logs" on hike_logs;
drop policy if exists "Signed-in users can read hike logs" on hike_logs;
create policy "Signed-in users can read hike logs"
  on hike_logs for select to authenticated using (true);

drop policy if exists "Users can read their own log photos" on log_photos;
drop policy if exists "Signed-in users can read log photos" on log_photos;
create policy "Signed-in users can read log photos"
  on log_photos for select to authenticated using (true);

drop policy if exists "Users can read their own log tags" on log_tags;
drop policy if exists "Signed-in users can read log tags" on log_tags;
create policy "Signed-in users can read log tags"
  on log_tags for select to authenticated using (true);

drop policy if exists "Users can read comments on their logs or their own comments" on comments;
drop policy if exists "Signed-in users can read comments" on comments;
create policy "Signed-in users can read comments"
  on comments for select to authenticated using (true);

-- ─── Storage: hike-photos bucket for post photos/videos and profile pictures (also in 002) ──
-- Public so the files can be shown directly; files live under <user id>/... and
-- users can only add or remove files in their own folder.

insert into storage.buckets (id, name, public)
values ('hike-photos', 'hike-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Users can upload their own hike photos" on storage.objects;
create policy "Users can upload their own hike photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'hike-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Removing a file needs select as well as delete permission
drop policy if exists "Users can see their own hike photos" on storage.objects;
create policy "Users can see their own hike photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'hike-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own hike photos" on storage.objects;
create policy "Users can delete their own hike photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'hike-photos' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
