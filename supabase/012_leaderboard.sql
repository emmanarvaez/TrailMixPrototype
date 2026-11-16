-- 012: the Leaderboard tab on the Feed screen. Safe to run more than once.
--
-- Returns hike and ingredient counts for the signed-in user and their accepted friends
-- only. It counts every hike (archived ones too, which friends can't read directly) and
-- reads user_ingredients, which is otherwise private to each user, so it runs as a
-- security definer function that only ever returns those people.
--
-- week_start: the Monday the app counts "this week" from, in the viewer's own time zone
-- (hike_logs.date is the local date the hike was logged).
-- ingredients: unlocked ingredients out of 12, counted the way the app does: the saved
-- unlocks or the 3 + one per 2 hikes everyone earns, whichever is more.

create or replace function public.get_leaderboard(week_start date)
returns table (user_id uuid, week_hikes integer, total_hikes integer, ingredients integer)
language sql stable security definer set search_path = public
as $$
  with people as (
    select auth.uid() as id
    union
    select case when sender_id = auth.uid() then recipient_id else sender_id end
    from friend_requests
    where status = 'accepted' and auth.uid() in (sender_id, recipient_id)
  ),
  hikes as (
    select
      p.id,
      count(l.id) filter (where l.date >= week_start) as week_hikes,
      count(l.id) as total_hikes
    from people p
    left join hike_logs l on l.user_id = p.id
    where p.id is not null
    group by p.id
  ),
  unlocks as (
    select u.user_id as id, count(*) as saved
    from user_ingredients u
    where u.user_id in (select id from people)
      and u.ingredient_key in (
        'cashews', 'almonds', 'pretzels', 'mms', 'chocolate-chips', 'popcorn',
        'chex-mix', 'dried-bananas', 'sunflower-seeds', 'pumpkin-seeds', 'dried-cranberries', 'raisins'
      )
    group by u.user_id
  )
  select
    h.id,
    h.week_hikes::integer,
    h.total_hikes::integer,
    least(12, greatest(coalesce(un.saved, 0), 3 + h.total_hikes / 2))::integer
  from hikes h
  left join unlocks un on un.id = h.id
$$;

revoke all on function public.get_leaderboard(date) from public, anon;
grant execute on function public.get_leaderboard(date) to authenticated;
