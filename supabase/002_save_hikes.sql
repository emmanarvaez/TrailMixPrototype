-- TrailMix migration 002: real trails, saved hikes, and photo storage
-- Run AFTER schema.sql, in the Supabase SQL editor (Database → SQL Editor → New query).
-- Safe to run more than once.

-- ─── trails: add area, store distance/elevation as numbers ───────────────────

alter table trails add column if not exists area text;

-- distance in miles, elevation gain in feet
alter table trails
  alter column distance type numeric(5,1)
  using nullif(regexp_replace(distance::text, '[^0-9.]', '', 'g'), '')::numeric;

alter table trails
  alter column elevation type integer
  using nullif(regexp_replace(elevation::text, '[^0-9]', '', 'g'), '')::integer;

-- Trail names are unique so the seed file can upsert by name
create unique index if not exists trails_name_key on trails(name);

-- ─── hike_logs: match the app's difficulty slider ────────────────────────────

alter table hike_logs drop constraint if exists hike_logs_difficulty_felt_check;
alter table hike_logs
  add constraint hike_logs_difficulty_felt_check
  check (difficulty_felt in ('Easy', 'Moderate', 'Tough'));

-- ─── storage: hike-photos bucket ─────────────────────────────────────────────
-- Public bucket so photo URLs can be shown directly in <img> tags.
-- Files are stored as <user id>/<log id>/<file>, and users can only write to their own folder.

insert into storage.buckets (id, name, public)
values ('hike-photos', 'hike-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Users can upload their own hike photos" on storage.objects;
create policy "Users can upload their own hike photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'hike-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own hike photos" on storage.objects;
create policy "Users can delete their own hike photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'hike-photos' and (storage.foldername(name))[1] = auth.uid()::text);
