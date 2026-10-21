-- TrailMix schema
-- Run this entire file in the Supabase SQL editor (Database → SQL Editor → New query)

-- Enable UUID extension (already on by default in Supabase)
create extension if not exists "pgcrypto";

-- ─── profiles ────────────────────────────────────────────────────────────────

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  avatar_url  text,
  phone       text,
  created_at  timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can read any profile"
  on profiles for select using (true);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

-- ─── friendships ─────────────────────────────────────────────────────────────

create table if not exists friendships (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  friend_id   uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(user_id, friend_id)
);

alter table friendships enable row level security;

create policy "Users can read their own friendships"
  on friendships for select using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can create friendships they own"
  on friendships for insert with check (auth.uid() = user_id);

create policy "Users can delete their own friendships"
  on friendships for delete using (auth.uid() = user_id);

-- ─── trails ──────────────────────────────────────────────────────────────────

create table if not exists trails (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  distance    text,
  elevation   text,
  difficulty  text check (difficulty in ('Easy', 'Moderate', 'Hard')),
  image_url   text,
  created_at  timestamptz not null default now()
);

alter table trails enable row level security;

create policy "Anyone can read trails"
  on trails for select using (true);

-- ─── hike_logs ────────────────────────────────────────────────────────────────

create table if not exists hike_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  trail_id        uuid references trails(id) on delete set null,
  trail_name      text,          -- denormalised for display
  date            date not null,
  reaction        text,          -- emoji or label
  difficulty_felt text check (difficulty_felt in ('Easier than expected', 'Just right', 'Harder than expected')),
  highlight       text,          -- short highlight label
  caption         text,
  rank            integer,       -- user-defined sort order
  created_at      timestamptz not null default now()
);

alter table hike_logs enable row level security;

create policy "Users can read their own hike logs"
  on hike_logs for select using (auth.uid() = user_id);

create policy "Users can insert their own hike logs"
  on hike_logs for insert with check (auth.uid() = user_id);

create policy "Users can update their own hike logs"
  on hike_logs for update using (auth.uid() = user_id);

create policy "Users can delete their own hike logs"
  on hike_logs for delete using (auth.uid() = user_id);

-- ─── log_photos ──────────────────────────────────────────────────────────────

create table if not exists log_photos (
  id          uuid primary key default gen_random_uuid(),
  log_id      uuid not null references hike_logs(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  url         text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table log_photos enable row level security;

create policy "Users can read their own log photos"
  on log_photos for select using (auth.uid() = user_id);

create policy "Users can insert their own log photos"
  on log_photos for insert with check (auth.uid() = user_id);

create policy "Users can delete their own log photos"
  on log_photos for delete using (auth.uid() = user_id);

-- ─── log_tags ────────────────────────────────────────────────────────────────

create table if not exists log_tags (
  id          uuid primary key default gen_random_uuid(),
  log_id      uuid not null references hike_logs(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  tag         text not null,
  created_at  timestamptz not null default now()
);

alter table log_tags enable row level security;

create policy "Users can read their own log tags"
  on log_tags for select using (auth.uid() = user_id);

create policy "Users can insert their own log tags"
  on log_tags for insert with check (auth.uid() = user_id);

create policy "Users can delete their own log tags"
  on log_tags for delete using (auth.uid() = user_id);

-- ─── comments ────────────────────────────────────────────────────────────────

create table if not exists comments (
  id          uuid primary key default gen_random_uuid(),
  log_id      uuid not null references hike_logs(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

alter table comments enable row level security;

-- Comments on a log are visible to the log owner and the commenter
create policy "Users can read comments on their logs or their own comments"
  on comments for select
  using (
    auth.uid() = user_id
    or auth.uid() = (select user_id from hike_logs where id = log_id)
  );

create policy "Users can insert comments"
  on comments for insert with check (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on comments for delete using (auth.uid() = user_id);

-- ─── likes ───────────────────────────────────────────────────────────────────

create table if not exists likes (
  id          uuid primary key default gen_random_uuid(),
  log_id      uuid not null references hike_logs(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(log_id, user_id)
);

alter table likes enable row level security;

create policy "Users can read likes"
  on likes for select using (true);

create policy "Users can insert their own likes"
  on likes for insert with check (auth.uid() = user_id);

create policy "Users can delete their own likes"
  on likes for delete using (auth.uid() = user_id);

-- ─── saved_trails ────────────────────────────────────────────────────────────

create table if not exists saved_trails (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  trail_id    uuid not null references trails(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(user_id, trail_id)
);

alter table saved_trails enable row level security;

create policy "Users can read their own saved trails"
  on saved_trails for select using (auth.uid() = user_id);

create policy "Users can insert their own saved trails"
  on saved_trails for insert with check (auth.uid() = user_id);

create policy "Users can delete their own saved trails"
  on saved_trails for delete using (auth.uid() = user_id);

-- ─── user_ingredients ────────────────────────────────────────────────────────

create table if not exists user_ingredients (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  ingredient_key  text not null,   -- matches detailOptions[i].ingredient slug
  unlocked_at     timestamptz not null default now(),
  unique(user_id, ingredient_key)
);

alter table user_ingredients enable row level security;

create policy "Users can read their own ingredients"
  on user_ingredients for select using (auth.uid() = user_id);

create policy "Users can insert their own ingredients"
  on user_ingredients for insert with check (auth.uid() = user_id);

create policy "Users can delete their own ingredients"
  on user_ingredients for delete using (auth.uid() = user_id);

-- ─── auto-create profile on sign-up ──────────────────────────────────────────
-- This trigger fires when a new row is inserted into auth.users.
-- It creates the matching public profile so RLS policies always have a row to find.

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
