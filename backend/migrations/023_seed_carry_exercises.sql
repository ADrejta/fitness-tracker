-- Update existing loaded carry exercises to the 'carry' category
UPDATE exercise_templates SET category = 'carry'
WHERE id IN ('ex-farmers-walk', 'ex-trap-bar-carry');

-- Add more loaded carry / distance-based strength exercises
INSERT INTO exercise_templates (id, name, category, is_custom, description, instructions) VALUES
('ex-sled-push',   'Sled Push',         'carry', false, 'Push a weighted sled for distance — builds lower body power and conditioning', ARRAY['Load sled with desired weight', 'Drive through the floor with short powerful steps', 'Keep hips low and back flat', 'Push for the target distance']),
('ex-sled-pull',   'Sled Pull',         'carry', false, 'Drag a weighted sled for distance — targets the posterior chain and back', NULL),
('ex-yoke-carry',  'Yoke Carry',        'carry', false, 'Walk with a heavy yoke frame across the upper back — tests full-body strength and stability', NULL),
('ex-sandbag-carry','Sandbag Carry',    'carry', false, 'Carry a heavy sandbag for distance — unstable load challenges core and grip', NULL),
('ex-zercher-carry','Zercher Carry',    'carry', false, 'Carry a barbell in the crook of the elbows for distance — intense for the upper back and core', NULL)
ON CONFLICT (id) DO NOTHING;

-- Muscle groups
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group) VALUES
('ex-sled-push',    'quads'),   ('ex-sled-push',    'glutes'),  ('ex-sled-push',    'calves'),
('ex-sled-pull',    'hamstrings'), ('ex-sled-pull', 'glutes'),  ('ex-sled-pull',    'back'),
('ex-yoke-carry',   'traps'),   ('ex-yoke-carry',   'back'),    ('ex-yoke-carry',   'quads'), ('ex-yoke-carry', 'abs'),
('ex-sandbag-carry','forearms'),('ex-sandbag-carry','abs'),     ('ex-sandbag-carry','back'),
('ex-zercher-carry','abs'),     ('ex-zercher-carry','back'),    ('ex-zercher-carry','biceps')
ON CONFLICT DO NOTHING;

-- Equipment
INSERT INTO exercise_equipment (exercise_id, equipment) VALUES
('ex-sled-push',    'bodyweight'),
('ex-sled-pull',    'bodyweight'),
('ex-yoke-carry',   'barbell'),
('ex-sandbag-carry','bodyweight'),
('ex-zercher-carry','barbell')
ON CONFLICT DO NOTHING;
