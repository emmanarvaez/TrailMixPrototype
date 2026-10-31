-- TrailMix migration 005: unique usernames, private emails, and public follows (Instagram-style)
-- Run in the Supabase SQL editor (Database → SQL Editor → New query) after 004_real_data.sql.
-- Safe to run more than once.

begin;

-- ─── Usernames ───────────────────────────────────────────────────────────────
-- 3–20 characters: lowercase letters, numbers, underscores and periods.
-- Unique ignoring case. Existing users start without one and pick it on their next sign-in.

alter table profiles add column if not exists username text;

alter table profiles drop constraint if exists profiles_username_format;
alter table profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_.]{3,20}$');

create unique index if not exists profiles_username_lower_key on profiles (lower(username));

-- ─── Keep emails and phone numbers private ──────────────────────────────────
-- Other users can read only these public columns. Your own email and phone come from
-- get_my_profile() below, so nobody else can ever read them through the API.

revoke select on profiles from anon, authenticated;
grant select (id, name, username, avatar_url, created_at) on profiles to authenticated;

create or replace function public.get_my_profile()
returns table (id uuid, name text, username text, avatar_url text, phone text, email text, has_onboarded boolean)
language sql stable security definer set search_path = public
as $$
  select p.id, p.name, p.username, p.avatar_url, p.phone, p.email, p.has_onboarded
  from profiles p
  where p.id = auth.uid()
$$;
revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

-- Whether a username can be used: right format and not taken by anyone else (your own
-- current username counts as available). Callable before signing in, for the sign-up form.
create or replace function public.username_available(candidate text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select candidate ~ '^[a-z0-9_.]{3,20}$'
    and not exists (
      select 1 from profiles
      where lower(username) = lower(candidate) and id is distinct from auth.uid()
    )
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- New accounts get the username chosen on the sign-up form
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    nullif(lower(new.raw_user_meta_data->>'username'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ─── Profiles: anyone signed in can view, only you can change yours ─────────

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on profiles;
create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

-- ─── Follows: public to signed-in users (for follower/following counts and lists),
-- but you can only follow or unfollow as yourself, and not yourself ──────────

drop policy if exists "Users can read their own friendships" on friendships;
drop policy if exists "Signed-in users can read follows" on friendships;
create policy "Signed-in users can read follows"
  on friendships for select to authenticated using (true);

drop policy if exists "Users can create friendships they own" on friendships;
drop policy if exists "Users can follow others" on friendships;
create policy "Users can follow others"
  on friendships for insert with check (auth.uid() = user_id and user_id <> friend_id);

drop policy if exists "Users can delete their own friendships" on friendships;
drop policy if exists "Users can unfollow" on friendships;
create policy "Users can unfollow"
  on friendships for delete using (auth.uid() = user_id);

commit;
