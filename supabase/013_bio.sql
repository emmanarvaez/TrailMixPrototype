-- TrailMix migration 013: a short bio on every profile (Instagram-style)
-- Run in the Supabase SQL editor (Database → SQL Editor → New query) after 012_leaderboard.sql.
-- Safe to run more than once.
--
-- The bio is public to everyone signed in, like the name and username. Only the profile's
-- owner can change it: the existing "Users can update their own profile" policy covers that.

begin;

alter table profiles add column if not exists bio text;

-- At most 150 characters; an empty bio is stored as null
alter table profiles drop constraint if exists profiles_bio_length;
alter table profiles
  add constraint profiles_bio_length check (bio is null or (char_length(bio) between 1 and 150));

-- Other users can read it along with the other public columns (see 005_friends.sql)
grant select (bio) on profiles to authenticated;

-- The signed-in user's own profile now includes their bio. The return type changes,
-- so the function is dropped and created again.
drop function if exists public.get_my_profile();
create function public.get_my_profile()
returns table (id uuid, name text, username text, avatar_url text, phone text, email text, has_onboarded boolean, bio text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.name, p.username, p.avatar_url, p.phone, p.email, p.has_onboarded, p.bio
  from profiles p
  where p.id = auth.uid()
$$;
revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

commit;
