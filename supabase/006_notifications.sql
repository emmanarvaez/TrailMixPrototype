-- TrailMix migration 006: notifications (follows, likes, comments, tags), Instagram-style
-- Run in the Supabase SQL editor (Database → SQL Editor → New query) after 005_friends.sql.
-- Safe to run more than once.
--
-- Notifications are created and removed by triggers on friendships, likes, comments and log_tags,
-- so the app never has to remember to do it. Users can only read their own notifications and
-- mark them read; nobody can insert them directly.

begin;

-- ─── Table ───────────────────────────────────────────────────────────────────

create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  actor_id     uuid not null references profiles(id) on delete cascade,
  type         text not null check (type in ('follow', 'like', 'comment', 'tag', 'reply')),
  hike_log_id  uuid references hike_logs(id) on delete cascade,  -- deleting a post removes its notifications
  comment_id   uuid references comments(id) on delete cascade,   -- deleting a comment removes its notification
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists notifications_recipient_id_idx on notifications (recipient_id);
create index if not exists notifications_created_at_idx on notifications (created_at desc);
create index if not exists notifications_recipient_created_idx on notifications (recipient_id, created_at desc);

-- One notification per event: following, liking or tagging twice can never stack up
create unique index if not exists notifications_one_per_event on notifications (
  recipient_id, actor_id, type,
  coalesce(hike_log_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(comment_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- ─── Access: read and mark-as-read your own; inserts only come from the triggers ──

alter table notifications enable row level security;

drop policy if exists "Users can read their own notifications" on notifications;
create policy "Users can read their own notifications"
  on notifications for select to authenticated using (auth.uid() = recipient_id);

drop policy if exists "Users can mark their own notifications read" on notifications;
create policy "Users can mark their own notifications read"
  on notifications for update to authenticated
  using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

revoke all on notifications from anon, authenticated;
grant select on notifications to authenticated;
grant update (read) on notifications to authenticated;  -- the read flag is the only thing users can change

-- ─── Triggers ────────────────────────────────────────────────────────────────
-- security definer so they can write notifications for other users. Nobody is ever
-- notified about their own actions.

-- Follow: "@username started following you"; unfollowing removes it
create or replace function public.notify_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.user_id <> new.friend_id then
      insert into notifications (recipient_id, actor_id, type)
      values (new.friend_id, new.user_id, 'follow')
      on conflict do nothing;
    end if;
    return new;
  end if;
  delete from notifications where type = 'follow' and recipient_id = old.friend_id and actor_id = old.user_id;
  return old;
end;
$$;

drop trigger if exists notify_follow on friendships;
create trigger notify_follow after insert or delete on friendships
  for each row execute function public.notify_follow();

-- Like: "@username liked your hike"; unliking removes it
create or replace function public.notify_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  owner uuid;
begin
  if tg_op = 'INSERT' then
    select user_id into owner from hike_logs where id = new.log_id;
    if owner is not null and owner <> new.user_id then
      insert into notifications (recipient_id, actor_id, type, hike_log_id)
      values (owner, new.user_id, 'like', new.log_id)
      on conflict do nothing;
    end if;
    return new;
  end if;
  delete from notifications where type = 'like' and actor_id = old.user_id and hike_log_id = old.log_id;
  return old;
end;
$$;

drop trigger if exists notify_like on likes;
create trigger notify_like after insert or delete on likes
  for each row execute function public.notify_like();

-- Comment: "@username commented: …" (deleting the comment removes it through comment_id's cascade)
create or replace function public.notify_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  owner uuid;
begin
  select user_id into owner from hike_logs where id = new.log_id;
  if owner is not null and owner <> new.user_id then
    insert into notifications (recipient_id, actor_id, type, hike_log_id, comment_id)
    values (owner, new.user_id, 'comment', new.log_id, new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_comment on comments;
create trigger notify_comment after insert on comments
  for each row execute function public.notify_comment();

-- Tag: "@username tagged you in a hike"; removing the tag removes it.
-- log_tags.tag holds the tagged user's id as text; anything else is ignored.
create or replace function public.notify_tag()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  tagged uuid;
begin
  if tg_op = 'INSERT' then
    if new.tag ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      tagged := new.tag::uuid;
      if tagged <> new.user_id and exists (select 1 from profiles where id = tagged) then
        insert into notifications (recipient_id, actor_id, type, hike_log_id)
        values (tagged, new.user_id, 'tag', new.log_id)
        on conflict do nothing;
      end if;
    end if;
    return new;
  end if;
  if old.tag ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    delete from notifications where type = 'tag' and hike_log_id = old.log_id and recipient_id = old.tag::uuid;
  end if;
  return old;
end;
$$;

drop trigger if exists notify_tag on log_tags;
create trigger notify_tag after insert or delete on log_tags
  for each row execute function public.notify_tag();

-- (Comment replies don't exist yet. When they do, a trigger can add type 'reply'.)

-- ─── Existing activity, so the page isn't empty for current users ───────────
-- Added as already read, so nobody gets a pile of old unread notifications.

insert into notifications (recipient_id, actor_id, type, read, created_at)
select f.friend_id, f.user_id, 'follow', true, f.created_at
from friendships f where f.user_id <> f.friend_id
on conflict do nothing;

insert into notifications (recipient_id, actor_id, type, hike_log_id, read, created_at)
select h.user_id, l.user_id, 'like', l.log_id, true, l.created_at
from likes l join hike_logs h on h.id = l.log_id where h.user_id <> l.user_id
on conflict do nothing;

insert into notifications (recipient_id, actor_id, type, hike_log_id, comment_id, read, created_at)
select h.user_id, c.user_id, 'comment', c.log_id, c.id, true, c.created_at
from comments c join hike_logs h on h.id = c.log_id where h.user_id <> c.user_id
on conflict do nothing;

insert into notifications (recipient_id, actor_id, type, hike_log_id, read, created_at)
select t.tag::uuid, t.user_id, 'tag', t.log_id, true, t.created_at
from log_tags t
where t.tag ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and t.tag::uuid <> t.user_id
  and exists (select 1 from profiles p where p.id = t.tag::uuid)
on conflict do nothing;

-- ─── Realtime: new notifications appear while the app is open ───────────────

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table notifications;
  end if;
end;
$$;

commit;
