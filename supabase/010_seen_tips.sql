-- 010: remember which of Cashew's Log a Hike tips each user has seen, so they show once
-- per account rather than once per device. Safe to run more than once.

alter table profiles add column if not exists seen_tips text[] not null default '{}';

-- Profiles only expose public columns to other users (see 005), so the signed-in user
-- reads and changes their own seen_tips through these functions.

create or replace function public.get_my_seen_tips()
returns text[]
language sql stable security definer set search_path = public
as $$
  select coalesce((select seen_tips from profiles where id = auth.uid()), '{}')
$$;

-- Adds tips to the list (each tip once)
create or replace function public.mark_tips_seen(tips text[])
returns void
language sql security definer set search_path = public
as $$
  update profiles
  set seen_tips = array(select distinct unnest(seen_tips || tips))
  where id = auth.uid()
$$;

-- "Replay tips" in Settings
create or replace function public.reset_seen_tips()
returns void
language sql security definer set search_path = public
as $$
  update profiles set seen_tips = '{}' where id = auth.uid()
$$;

revoke all on function public.get_my_seen_tips() from public, anon;
revoke all on function public.mark_tips_seen(text[]) from public, anon;
revoke all on function public.reset_seen_tips() from public, anon;
grant execute on function public.get_my_seen_tips() to authenticated;
grant execute on function public.mark_tips_seen(text[]) to authenticated;
grant execute on function public.reset_seen_tips() to authenticated;
