-- TrailMix seed: Orange County trails
-- Run AFTER 002_save_hikes.sql. Safe to run more than once (updates existing rows by name).
-- Distances are round-trip miles; elevation is total gain in feet. Values are approximate.

insert into trails (name, area, distance, elevation, difficulty, image_url) values
  ('Bommer Canyon Loop',            'Irvine',              4.2,  560, 'Moderate', 'https://images.unsplash.com/photo-1642746194421-8a5e8eabf323?auto=format&fit=crop&w=900&q=88'),
  ('Top of the World',              'Laguna Beach',        2.4,  510, 'Moderate', 'https://images.unsplash.com/photo-1603642696724-f522cbcca174?auto=format&fit=crop&w=900&q=88'),
  ('Holy Jim Falls',                'Trabuco Canyon',      2.8,  650, 'Moderate', 'https://images.unsplash.com/photo-1605068533794-cd164042be22?auto=format&fit=crop&w=900&q=88'),
  ('Crystal Cove Moro Ridge',       'Newport Coast',       6.8, 1100, 'Hard',     'https://images.unsplash.com/photo-1579912583830-cfec19b43150?auto=format&fit=crop&w=900&q=88'),
  ('Peters Canyon Loop',            'Orange',              5.5,  550, 'Moderate', 'https://images.unsplash.com/photo-1642746194421-8a5e8eabf323?auto=format&fit=crop&w=900&q=88'),
  ('Quail Hill Loop',               'Irvine',              2.1,  180, 'Easy',     'https://images.unsplash.com/photo-1603642696724-f522cbcca174?auto=format&fit=crop&w=900&q=88'),
  ('Black Star Canyon Falls',       'Silverado',           6.6, 1050, 'Hard',     'https://images.unsplash.com/photo-1605068533794-cd164042be22?auto=format&fit=crop&w=900&q=88'),
  ('Buck Gully Trail',              'Corona del Mar',      3.2,  420, 'Easy',     'https://images.unsplash.com/photo-1579912583830-cfec19b43150?auto=format&fit=crop&w=900&q=88'),
  ('Laurel Canyon Loop',            'Laguna Canyon',       3.6,  620, 'Moderate', 'https://images.unsplash.com/photo-1642746194421-8a5e8eabf323?auto=format&fit=crop&w=900&q=88'),
  ('Santiago Oaks Loop',            'Orange',              3.4,  600, 'Moderate', 'https://images.unsplash.com/photo-1603642696724-f522cbcca174?auto=format&fit=crop&w=900&q=88'),
  ('Red Rock Canyon',               'Foothill Ranch',      4.4,  540, 'Moderate', 'https://images.unsplash.com/photo-1605068533794-cd164042be22?auto=format&fit=crop&w=900&q=88'),
  ('Santiago Peak via Holy Jim',    'Trabuco Canyon',     15.8, 4300, 'Hard',     'https://images.unsplash.com/photo-1579912583830-cfec19b43150?auto=format&fit=crop&w=900&q=88'),
  ('West Horsethief Loop',          'Trabuco Canyon',      8.2, 2500, 'Hard',     'https://images.unsplash.com/photo-1642746194421-8a5e8eabf323?auto=format&fit=crop&w=900&q=88'),
  ('San Juan Loop Trail',           'Ortega Highway',      2.1,  400, 'Easy',     'https://images.unsplash.com/photo-1603642696724-f522cbcca174?auto=format&fit=crop&w=900&q=88'),
  ('Chiquito Falls',                'Ortega Highway',      9.2, 1600, 'Hard',     'https://images.unsplash.com/photo-1605068533794-cd164042be22?auto=format&fit=crop&w=900&q=88'),
  ('Caspers Bell Canyon Loop',      'San Juan Capistrano', 5.0,  600, 'Moderate', 'https://images.unsplash.com/photo-1579912583830-cfec19b43150?auto=format&fit=crop&w=900&q=88'),
  ('O''Neill Park Vista Point',     'Trabuco Canyon',      3.0,  650, 'Moderate', 'https://images.unsplash.com/photo-1642746194421-8a5e8eabf323?auto=format&fit=crop&w=900&q=88'),
  ('Riley Wilderness Park Loop',    'Coto de Caza',        2.8,  350, 'Easy',     'https://images.unsplash.com/photo-1603642696724-f522cbcca174?auto=format&fit=crop&w=900&q=88'),
  ('Aliso Peak Trail',              'Laguna Niguel',       1.8,  300, 'Easy',     'https://images.unsplash.com/photo-1605068533794-cd164042be22?auto=format&fit=crop&w=900&q=88'),
  ('Wood Canyon Trail',             'Aliso Viejo',         7.0,  450, 'Moderate', 'https://images.unsplash.com/photo-1579912583830-cfec19b43150?auto=format&fit=crop&w=900&q=88'),
  ('Carbon Canyon Redwood Grove',   'Brea',                2.0,  100, 'Easy',     'https://images.unsplash.com/photo-1642746194421-8a5e8eabf323?auto=format&fit=crop&w=900&q=88'),
  ('Upper Newport Bay Loop',        'Newport Beach',      10.5,  200, 'Moderate', 'https://images.unsplash.com/photo-1603642696724-f522cbcca174?auto=format&fit=crop&w=900&q=88'),
  ('Dana Point Headlands',          'Dana Point',          1.6,  150, 'Easy',     'https://images.unsplash.com/photo-1605068533794-cd164042be22?auto=format&fit=crop&w=900&q=88'),
  ('San Clemente Beach Trail',      'San Clemente',        4.6,  100, 'Easy',     'https://images.unsplash.com/photo-1579912583830-cfec19b43150?auto=format&fit=crop&w=900&q=88'),
  ('Heisler Park Trail',            'Laguna Beach',        1.2,   80, 'Easy',     'https://images.unsplash.com/photo-1642746194421-8a5e8eabf323?auto=format&fit=crop&w=900&q=88')
on conflict (name) do update set
  area       = excluded.area,
  distance   = excluded.distance,
  elevation  = excluded.elevation,
  difficulty = excluded.difficulty,
  image_url  = excluded.image_url;
