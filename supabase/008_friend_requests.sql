-- TrailMix migration 008: mutual friends with friend requests, and friends-only hikes
-- Run in the Supabase SQL editor (Database → SQL Editor → New query) after 007_archive.sql.
-- Safe to run more than once.
--
-- Replaces one-way follows with friend requests that the other person accepts or declines.
-- Hikes (and their photos, tags, comments and likes) are only readable by their owner and
-- the owner's accepted friends, enforced here in the database, not just hidden in the app.
-- The old friendships (follows) table is left in place but no longer used.

begin;

-- ─── Table ───────────────────────────────────────────────────────────────────
-- One row per pair of people, whichever direction the request went. sender_id asked,
-- recipient_id answers. status: pending → accepted or declined.

create table if not exists friend_requests (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references profiles(id) on delete cascade,
  recipient_id  uuid not null references profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  constraint friend_requests_not_self check (sender_id <> recipient_id)
);

-- No duplicates: at most one request between two people, in either direction
create unique index if not exists friend_requests_one_per_pair
  on friend_requests (least(sender_id, recipient_id), greatest(sender_id, recipient_id));
create index if not exists friend_requests_sender_idx on friend_requests (sender_id, status);
create index if not exists friend_requests_recipient_idx on friend_requests (recipient_id, status);

-- ─── Who can see requests ───────────────────────────────────────────────────
-- Accepted friendships are visible to everyone signed in (for friend counts and lists).
-- Pending requests are visible to both people. A decline is only visible to the person
-- who declined, so the sender just sees "Add Friend" again.

alter table friend_requests enable row level security;

drop policy if exists "Friend requests are visible to the people involved" on friend_requests;
create policy "Friend requests are visible to the people involved"
  on friend_requests for select to authenticated
  using (
    status = 'accepted'
    or (status = 'pending' and auth.uid() in (sender_id, recipient_id))
    or (status = 'declined' and auth.uid() = recipient_id)
  );

-- Nobody writes to the table directly: every change goes through the functions below,
-- which check who is allowed to do what
revoke all on friend_requests from anon, authenticated;
grant select on friend_requests to authenticated;

-- ─── Friendship check, used by the visibility policies ──────────────────────

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from friend_requests
    where status = 'accepted'
      and least(sender_id, recipient_id) = least(a, b)
      and greatest(sender_id, recipient_id) = greatest(a, b)
  )
$$;
revoke all on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- ─── Actions ─────────────────────────────────────────────────────────────────

-- Send a request. Returns the resulting status: 'pending', or 'accepted' if they had
-- already asked you (sending one back accepts theirs) or you're already friends.
create or replace function public.send_friend_request(target uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  existing friend_requests%rowtype;
begin
  if me is null then raise exception 'Sign in to add friends.'; end if;
  if target = me then raise exception 'You can''t send a friend request to yourself.'; end if;
  if not exists (select 1 from profiles where id = target) then raise exception 'That person doesn''t exist.'; end if;

  select * into existing from friend_requests
  where least(sender_id, recipient_id) = least(me, target)
    and greatest(sender_id, recipient_id) = greatest(me, target)
  for update;

  if not found then
    insert into friend_requests (sender_id, recipient_id) values (me, target);
    return 'pending';
  end if;
  if existing.status = 'accepted' then return 'accepted'; end if;
  if existing.status = 'pending' then
    if existing.sender_id = me then return 'pending'; end if; -- already sent: no duplicate
    update friend_requests set status = 'accepted', responded_at = now() where id = existing.id;
    return 'accepted';
  end if;
  -- Declined earlier (either way round): start a fresh request from me
  update friend_requests
  set sender_id = me, recipient_id = target, status = 'pending', created_at = now(), responded_at = null
  where id = existing.id;
  return 'pending';
end;
$$;

-- Accept or decline a pending request someone sent you
create or replace function public.respond_to_friend_request(requester uuid, accept boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update friend_requests
  set status = case when accept then 'accepted' else 'declined' end, responded_at = now()
  where sender_id = requester and recipient_id = auth.uid() and status = 'pending';
  if not found then raise exception 'That friend request isn''t pending anymore.'; end if;
end;
$$;

-- Take back a request you sent that hasn't been answered
create or replace function public.cancel_friend_request(target uuid)
returns void
language sql security definer set search_path = public
as $$
  delete from friend_requests
  where sender_id = auth.uid() and recipient_id = target and status = 'pending'
$$;

-- Unfriend: removes the friendship for both people
create or replace function public.remove_friend(other uuid)
returns void
language sql security definer set search_path = public
as $$
  delete from friend_requests
  where status = 'accepted'
    and least(sender_id, recipient_id) = least(auth.uid(), other)
    and greatest(sender_id, recipient_id) = greatest(auth.uid(), other)
$$;

revoke all on function public.send_friend_request(uuid) from public, anon;
revoke all on function public.respond_to_friend_request(uuid, boolean) from public, anon;
revoke all on function public.cancel_friend_request(uuid) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_to_friend_request(uuid, boolean) to authenticated;
grant execute on function public.cancel_friend_request(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;

-- ─── Friends-only hikes ──────────────────────────────────────────────────────
-- You see your own hikes (archived or not) and your friends' unarchived hikes.
-- Photos, tags, comments and likes already follow their hike's visibility (007_archive.sql),
-- so they become friends-only too. Pending requests give no access.

drop policy if exists "Signed-in users can read hike logs" on hike_logs;
drop policy if exists "Friends can read hike logs" on hike_logs;
create policy "Friends can read hike logs"
  on hike_logs for select to authenticated
  using (auth.uid() = user_id or (archived_at is null and public.are_friends(auth.uid(), user_id)));

-- Likes and comments only on hikes you can see
drop policy if exists "Users can insert comments" on comments;
create policy "Users can insert comments"
  on comments for insert with check (
    auth.uid() = user_id and exists (select 1 from hike_logs h where h.id = comments.log_id)
  );

drop policy if exists "Users can insert their own likes" on likes;
drop policy if exists "Users can like visible logs" on likes;
create policy "Users can like visible logs"
  on likes for insert with check (
    auth.uid() = user_id and exists (select 1 from hike_logs h where h.id = likes.log_id)
  );

-- ─── Notifications for requests ─────────────────────────────────────────────
-- 'friend_request': "@sam sent you a friend request" (removed once answered or cancelled)
-- 'friend_accept':  "@sam accepted your friend request" (removed if you unfriend)

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications
  add constraint notifications_type_check
  check (type in ('follow', 'like', 'comment', 'tag', 'reply', 'friend_request', 'friend_accept'));

create or replace function public.notify_friend_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    delete from notifications
    where type = 'friend_request' and recipient_id = old.recipient_id and actor_id = old.sender_id;
    if old.status = 'accepted' and (tg_op = 'DELETE' or new.status <> 'accepted') then
      delete from notifications
      where type = 'friend_accept' and recipient_id = old.sender_id and actor_id = old.recipient_id;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;

  if new.status = 'pending' then
    insert into notifications (recipient_id, actor_id, type)
    values (new.recipient_id, new.sender_id, 'friend_request')
    on conflict do nothing;
  elsif new.status = 'accepted' and (tg_op = 'INSERT' or old.status <> 'accepted') then
    insert into notifications (recipient_id, actor_id, type)
    values (new.sender_id, new.recipient_id, 'friend_accept')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_friend_request on friend_requests;
create trigger notify_friend_request after insert or update or delete on friend_requests
  for each row execute function public.notify_friend_request();

-- Follows no longer exist in the app
drop trigger if exists notify_follow on friendships;
delete from notifications where type = 'follow';

-- ─── Bring over existing follows ─────────────────────────────────────────────
-- People who followed each other become friends. A one-way follow becomes a pending
-- request from the follower, which the other person can accept or decline.

insert into friend_requests (sender_id, recipient_id, status, created_at, responded_at)
select distinct on (least(f.user_id, f.friend_id), greatest(f.user_id, f.friend_id))
  f.user_id,
  f.friend_id,
  case when exists (
    select 1 from friendships back where back.user_id = f.friend_id and back.friend_id = f.user_id
  ) then 'accepted' else 'pending' end,
  f.created_at,
  case when exists (
    select 1 from friendships back where back.user_id = f.friend_id and back.friend_id = f.user_id
  ) then now() end
from friendships f
where f.user_id <> f.friend_id
order by least(f.user_id, f.friend_id), greatest(f.user_id, f.friend_id), f.created_at
on conflict do nothing;

-- ─── Realtime: request changes show up while the app is open ────────────────

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friend_requests'
     ) then
    alter publication supabase_realtime add table friend_requests;
  end if;
end;
$$;

commit;
