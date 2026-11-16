-- 009: the new ingredient list (12 ingredients, tagged by what made the hike, one more
-- unlocked with each hike logged). Safe to run more than once: running it again changes
-- nothing unless hikes were added or deleted in between.

-- ─── 1. Retag hikes logged before the change ─────────────────────────────────
-- hike_logs.highlight holds the tags picked on a hike, comma separated ("Views, Climb").
-- Old tags become the closest new tag; old tags with no close match are dropped, so the
-- hike keeps no ingredient (the post itself stays). New tags map to themselves, which is
-- what makes a second run a no-op.
with tag_map(old_tag, new_tag) as (
  values
    -- old list
    ('Views',              'Scenery'),
    ('Summit',             'Scenery'),
    ('Climb',              'Rocky'),
    ('Meadow',             'Flowery'),
    -- 'Forest', 'Campfire', 'Snack Break' and 'Shade' have no close match: dropped
    -- new list (and old tags that kept their name: Rocky, Sunset, Waterfall, River)
    ('Scenery',            'Scenery'),
    ('Coastal',            'Coastal'),
    ('Rocky',              'Rocky'),
    ('Peaceful',           'Peaceful'),
    ('Crowded',            'Crowded'),
    ('Flowery',            'Flowery'),
    ('Wildlife encounter', 'Wildlife encounter'),
    ('Canine friendly',    'Canine friendly'),
    ('Sunrise',            'Sunrise'),
    ('Sunset',             'Sunset'),
    ('Waterfall',          'Waterfall'),
    ('River',              'River')
),
retagged as (
  select
    l.id,
    (
      -- each new tag once, in the order it was first picked
      select string_agg(picked.new_tag, ', ' order by picked.first_pick)
      from (
        select m.new_tag, min(t.pick) as first_pick
        from unnest(string_to_array(l.highlight, ',')) with ordinality as t(tag, pick)
        join tag_map m on m.old_tag = trim(t.tag)
        group by m.new_tag
      ) picked
    ) as new_highlight
  from hike_logs l
  where l.highlight is not null and l.highlight <> ''
)
update hike_logs h
set highlight = r.new_highlight -- null when none of its tags had a match
from retagged r
where h.id = r.id
  and h.highlight is distinct from r.new_highlight;

-- ─── 2. Unlocks: the first 3 ingredients plus one per hike logged (max 12) ───
-- user_ingredients.ingredient_key holds the app's ingredient keys. Each user keeps exactly
-- the first (3 + hikes logged) ingredients in unlock order; old keys are removed.
with ingredient_order(ingredient_key, unlock_order) as (
  values
    ('cashews', 1), ('almonds', 2), ('pretzels', 3), ('mms', 4),
    ('chocolate-chips', 5), ('popcorn', 6), ('chex-mix', 7), ('dried-bananas', 8),
    ('sunflower-seeds', 9), ('pumpkin-seeds', 10), ('dried-cranberries', 11), ('raisins', 12)
),
earned as (
  select p.id as user_id, least(12, 3 + count(l.id)) as unlocked
  from profiles p
  left join hike_logs l on l.user_id = p.id
  group by p.id
)
delete from user_ingredients u
where not exists (
  select 1
  from earned e
  join ingredient_order o on o.unlock_order <= e.unlocked
  where e.user_id = u.user_id and o.ingredient_key = u.ingredient_key
);

with ingredient_order(ingredient_key, unlock_order) as (
  values
    ('cashews', 1), ('almonds', 2), ('pretzels', 3), ('mms', 4),
    ('chocolate-chips', 5), ('popcorn', 6), ('chex-mix', 7), ('dried-bananas', 8),
    ('sunflower-seeds', 9), ('pumpkin-seeds', 10), ('dried-cranberries', 11), ('raisins', 12)
),
earned as (
  select p.id as user_id, least(12, 3 + count(l.id)) as unlocked
  from profiles p
  left join hike_logs l on l.user_id = p.id
  group by p.id
)
insert into user_ingredients (user_id, ingredient_key)
select e.user_id, o.ingredient_key
from earned e
join ingredient_order o on o.unlock_order <= e.unlocked
on conflict (user_id, ingredient_key) do nothing;
