ALTER TABLE workout_sets
    ADD COLUMN distance_meters FLOAT,
    ADD COLUMN duration_seconds INTEGER,
    ADD COLUMN calories INTEGER;

INSERT INTO exercise_templates (id, name, category, is_custom, description, instructions) VALUES
  ('ex-running',       'Running',       'cardio', false, 'Outdoor or treadmill running',      ARRAY['Maintain upright posture','Land mid-foot','Keep core engaged']),
  ('ex-cycling',       'Cycling',       'cardio', false, 'Indoor or outdoor cycling',         ARRAY['Adjust seat height','Maintain cadence','Keep core stable']),
  ('ex-rowing',        'Rowing',        'cardio', false, 'Rowing machine cardio',             ARRAY['Drive with legs first','Lean back slightly','Pull to lower chest']),
  ('ex-jump-rope',     'Jump Rope',     'cardio', false, 'Cardio jump rope session',          ARRAY['Keep elbows close','Jump low','Land on balls of feet']),
  ('ex-swimming',      'Swimming',      'cardio', false, 'Swimming laps',                     ARRAY['Maintain horizontal body','Breathe rhythmically','Use flip turns']),
  ('ex-stair-climber', 'Stair Climber', 'cardio', false, 'Stair climbing machine',            ARRAY['Avoid leaning on handrails','Keep steady pace','Full step each foot']),
  ('ex-elliptical',    'Elliptical',    'cardio', false, 'Elliptical trainer',                ARRAY['Keep upright posture','Use arm handles','Maintain steady stride']),
  ('ex-battle-ropes',  'Battle Ropes',  'cardio', false, 'Battle rope cardio',                ARRAY['Grip firmly','Use whole body','Keep core braced'])
ON CONFLICT (id) DO NOTHING;
