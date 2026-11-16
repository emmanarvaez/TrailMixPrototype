-- 011: one new ingredient every 2 hikes (the 2nd, 4th, 6th, …), not one per hike, so the
-- first hike doesn't unlock anything. Run after 009. Safe to run more than once.
--
-- Each user keeps exactly the first 3 + (hikes logged ÷ 2, rounded down) ingredients in
-- unlock order (max 12). This takes back unlocks earned under the one-per-hike rule.

with ingredient_order(ingredient_key, unlock_order) as (
  values
    ('cashews', 1), ('almonds', 2), ('pretzels', 3), ('mms', 4),
    ('chocolate-chips', 5), ('popcorn', 6), ('chex-mix', 7), ('dried-bananas', 8),
    ('sunflower-seeds', 9), ('pumpkin-seeds', 10), ('dried-cranberries', 11), ('raisins', 12)
),
earned as (
  select p.id as user_id, least(12, 3 + count(l.id) / 2) as unlocked
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
  select p.id as user_id, least(12, 3 + count(l.id) / 2) as unlocked
  from profiles p
  left join hike_logs l on l.user_id = p.id
  group by p.id
)
insert into user_ingredients (user_id, ingredient_key)
select e.user_id, o.ingredient_key
from earned e
join ingredient_order o on o.unlock_order <= e.unlocked
on conflict (user_id, ingredient_key) do nothing;
