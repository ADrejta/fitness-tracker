-- Seed default exercises

-- Chest exercises
INSERT INTO exercise_templates (id, name, category, is_custom, description, instructions) VALUES
('ex-bench-press', 'Barbell Bench Press', 'strength', false, 'Classic compound chest exercise', ARRAY['Lie flat on bench', 'Grip bar slightly wider than shoulder width', 'Lower bar to chest', 'Press up to starting position']),
('ex-incline-bench', 'Incline Barbell Bench Press', 'strength', false, 'Upper chest focused pressing movement', NULL),
('ex-db-bench', 'Dumbbell Bench Press', 'strength', false, 'Dumbbell variation for improved range of motion', NULL),
('ex-db-incline-bench', 'Incline Dumbbell Bench Press', 'strength', false, 'Upper chest with dumbbells', NULL),
('ex-chest-fly', 'Dumbbell Chest Fly', 'strength', false, 'Isolation exercise for chest', NULL),
('ex-cable-fly', 'Cable Chest Fly', 'strength', false, 'Constant tension chest isolation', NULL),
('ex-push-up', 'Push-Up', 'bodyweight', false, 'Fundamental bodyweight pushing exercise', NULL),
('ex-dip', 'Dip', 'bodyweight', false, 'Compound exercise for chest and triceps', NULL),
('ex-machine-chest-press', 'Machine Chest Press', 'strength', false, 'Machine pressing movement', NULL),
('ex-pec-deck', 'Pec Deck', 'strength', false, 'Machine chest fly', NULL);

-- Leg exercises
INSERT INTO exercise_templates (id, name, category, is_custom, description, instructions) VALUES
('ex-squat', 'Barbell Back Squat', 'strength', false, 'King of leg exercises', ARRAY['Position bar on upper back', 'Feet shoulder width apart', 'Descend until thighs parallel', 'Drive up through heels']),
('ex-front-squat', 'Front Squat', 'strength', false, 'Quad-dominant squat variation', NULL),
('ex-goblet-squat', 'Goblet Squat', 'strength', false, 'Beginner-friendly squat variation', NULL),
('ex-leg-press', 'Leg Press', 'strength', false, 'Machine-based leg compound movement', NULL),
('ex-lunges', 'Walking Lunges', 'strength', false, 'Unilateral leg exercise', NULL),
('ex-leg-extension', 'Leg Extension', 'strength', false, 'Quad isolation exercise', NULL),
('ex-leg-curl', 'Lying Leg Curl', 'strength', false, 'Hamstring isolation exercise', NULL),
('ex-romanian-dl', 'Romanian Deadlift', 'strength', false, 'Hip hinge for posterior chain', NULL),
('ex-calf-raise', 'Standing Calf Raise', 'strength', false, 'Calf muscle builder', NULL),
('ex-seated-calf', 'Seated Calf Raise', 'strength', false, 'Soleus-focused calf exercise', NULL),
('ex-hack-squat', 'Hack Squat', 'strength', false, 'Machine squat variation', NULL),
('ex-bulgarian-split', 'Bulgarian Split Squat', 'strength', false, 'Single leg squat variation', NULL),
('ex-smith-squat', 'Smith Machine Squat', 'strength', false, 'Guided squat movement', NULL),
('ex-hip-thrust', 'Barbell Hip Thrust', 'strength', false, 'Glute-focused hip extension', NULL),
('ex-glute-bridge', 'Glute Bridge', 'bodyweight', false, 'Bodyweight glute activation', NULL),
('ex-step-up', 'Step-Up', 'strength', false, 'Unilateral leg exercise', NULL),
('ex-box-jump', 'Box Jump', 'bodyweight', false, 'Plyometric leg exercise', NULL);

-- Back exercises
INSERT INTO exercise_templates (id, name, category, is_custom, description, instructions) VALUES
('ex-deadlift', 'Conventional Deadlift', 'strength', false, 'Full body compound lift', ARRAY['Stand with feet hip-width', 'Grip bar outside knees', 'Keep back flat', 'Drive through floor to stand']),
('ex-sumo-deadlift', 'Sumo Deadlift', 'strength', false, 'Wide-stance deadlift variation', NULL),
('ex-bent-row', 'Barbell Bent Over Row', 'strength', false, 'Fundamental back builder', NULL),
('ex-db-row', 'Dumbbell Row', 'strength', false, 'Unilateral back exercise', NULL),
('ex-pull-up', 'Pull-Up', 'bodyweight', false, 'Classic vertical pull', NULL),
('ex-chin-up', 'Chin-Up', 'bodyweight', false, 'Supinated grip pull-up', NULL),
('ex-lat-pulldown', 'Lat Pulldown', 'strength', false, 'Machine vertical pull', NULL),
('ex-cable-row', 'Seated Cable Row', 'strength', false, 'Horizontal cable pulling', NULL),
('ex-t-bar-row', 'T-Bar Row', 'strength', false, 'Chest-supported row variation', NULL),
('ex-machine-row', 'Machine Row', 'strength', false, 'Chest-supported machine row', NULL),
('ex-back-extension', 'Back Extension', 'bodyweight', false, 'Lower back strengthening', NULL),
('ex-good-morning', 'Good Morning', 'strength', false, 'Hip hinge with bar on back', NULL);

-- Shoulder exercises
INSERT INTO exercise_templates (id, name, category, is_custom, description, instructions) VALUES
('ex-ohp', 'Overhead Press', 'strength', false, 'Standing shoulder press', NULL),
('ex-db-shoulder-press', 'Dumbbell Shoulder Press', 'strength', false, 'Seated or standing dumbbell press', NULL),
('ex-lateral-raise', 'Lateral Raise', 'strength', false, 'Side delt isolation', NULL),
('ex-front-raise', 'Front Raise', 'strength', false, 'Front delt isolation', NULL),
('ex-rear-delt-fly', 'Rear Delt Fly', 'strength', false, 'Rear deltoid isolation', NULL),
('ex-face-pull', 'Face Pull', 'strength', false, 'Rear delt and upper back exercise', NULL),
('ex-shrug', 'Barbell Shrug', 'strength', false, 'Trap builder', NULL),
('ex-machine-shoulder-press', 'Machine Shoulder Press', 'strength', false, 'Guided shoulder pressing', NULL),
('ex-upright-row', 'Upright Row', 'strength', false, 'Shoulder and trap exercise', NULL),
('ex-arnold-press', 'Arnold Press', 'strength', false, 'Rotational dumbbell press', NULL),
('ex-cable-lateral-raise', 'Cable Lateral Raise', 'strength', false, 'Constant tension lateral raise', NULL),
('ex-reverse-fly-machine', 'Reverse Fly Machine', 'strength', false, 'Machine rear delt fly', NULL);

-- Arm exercises
INSERT INTO exercise_templates (id, name, category, is_custom, description, instructions) VALUES
('ex-barbell-curl', 'Barbell Curl', 'strength', false, 'Classic bicep builder', NULL),
('ex-db-curl', 'Dumbbell Curl', 'strength', false, 'Dumbbell bicep curl', NULL),
('ex-hammer-curl', 'Hammer Curl', 'strength', false, 'Neutral grip bicep curl', NULL),
('ex-preacher-curl', 'Preacher Curl', 'strength', false, 'Isolated bicep curl', NULL),
('ex-cable-curl', 'Cable Curl', 'strength', false, 'Constant tension bicep curl', NULL),
('ex-tricep-pushdown', 'Tricep Pushdown', 'strength', false, 'Cable tricep isolation', NULL),
('ex-skull-crusher', 'Skull Crusher', 'strength', false, 'Lying tricep extension', NULL),
('ex-overhead-ext', 'Overhead Tricep Extension', 'strength', false, 'Long head tricep focus', NULL),
('ex-close-grip-bench', 'Close-Grip Bench Press', 'strength', false, 'Tricep-focused pressing', NULL),
('ex-wrist-curl', 'Wrist Curl', 'strength', false, 'Forearm flexor exercise', NULL),
('ex-concentration-curl', 'Concentration Curl', 'strength', false, 'Isolated bicep curl', NULL),
('ex-incline-curl', 'Incline Dumbbell Curl', 'strength', false, 'Stretched position bicep curl', NULL),
('ex-diamond-pushup', 'Diamond Push-Up', 'bodyweight', false, 'Close-grip push-up for triceps', NULL),
('ex-tricep-dip', 'Bench Dip', 'bodyweight', false, 'Tricep-focused dip variation', NULL);

-- Core exercises
INSERT INTO exercise_templates (id, name, category, is_custom, description, instructions) VALUES
('ex-crunch', 'Crunch', 'bodyweight', false, 'Basic ab exercise', NULL),
('ex-plank', 'Plank', 'bodyweight', false, 'Core stability exercise', NULL),
('ex-hanging-leg-raise', 'Hanging Leg Raise', 'bodyweight', false, 'Advanced ab exercise', NULL),
('ex-cable-crunch', 'Cable Crunch', 'strength', false, 'Weighted ab exercise', NULL),
('ex-russian-twist', 'Russian Twist', 'bodyweight', false, 'Rotational core exercise', NULL),
('ex-ab-wheel', 'Ab Wheel Rollout', 'strength', false, 'Advanced core exercise', NULL),
('ex-mountain-climber', 'Mountain Climber', 'bodyweight', false, 'Dynamic core and cardio exercise', NULL);

-- Other exercises
INSERT INTO exercise_templates (id, name, category, is_custom, description, instructions) VALUES
('ex-kettlebell-swing', 'Kettlebell Swing', 'strength', false, 'Hip hinge power exercise', NULL),
('ex-farmers-walk', 'Farmer''s Walk', 'strength', false, 'Loaded carry exercise', NULL);

-- Insert muscle groups for exercises
-- Chest exercises
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group) VALUES
('ex-bench-press', 'chest'), ('ex-bench-press', 'triceps'), ('ex-bench-press', 'shoulders'),
('ex-incline-bench', 'chest'), ('ex-incline-bench', 'shoulders'), ('ex-incline-bench', 'triceps'),
('ex-db-bench', 'chest'), ('ex-db-bench', 'triceps'), ('ex-db-bench', 'shoulders'),
('ex-db-incline-bench', 'chest'), ('ex-db-incline-bench', 'shoulders'), ('ex-db-incline-bench', 'triceps'),
('ex-chest-fly', 'chest'),
('ex-cable-fly', 'chest'),
('ex-push-up', 'chest'), ('ex-push-up', 'triceps'), ('ex-push-up', 'shoulders'),
('ex-dip', 'chest'), ('ex-dip', 'triceps'), ('ex-dip', 'shoulders'),
('ex-machine-chest-press', 'chest'), ('ex-machine-chest-press', 'triceps'),
('ex-pec-deck', 'chest');

-- Leg exercises
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group) VALUES
('ex-squat', 'quads'), ('ex-squat', 'glutes'), ('ex-squat', 'hamstrings'),
('ex-front-squat', 'quads'), ('ex-front-squat', 'glutes'),
('ex-goblet-squat', 'quads'), ('ex-goblet-squat', 'glutes'),
('ex-leg-press', 'quads'), ('ex-leg-press', 'glutes'), ('ex-leg-press', 'hamstrings'),
('ex-lunges', 'quads'), ('ex-lunges', 'glutes'), ('ex-lunges', 'hamstrings'),
('ex-leg-extension', 'quads'),
('ex-leg-curl', 'hamstrings'),
('ex-romanian-dl', 'hamstrings'), ('ex-romanian-dl', 'glutes'), ('ex-romanian-dl', 'lower-back'),
('ex-calf-raise', 'calves'),
('ex-seated-calf', 'calves'),
('ex-hack-squat', 'quads'), ('ex-hack-squat', 'glutes'),
('ex-bulgarian-split', 'quads'), ('ex-bulgarian-split', 'glutes'),
('ex-smith-squat', 'quads'), ('ex-smith-squat', 'glutes'),
('ex-hip-thrust', 'glutes'), ('ex-hip-thrust', 'hamstrings'),
('ex-glute-bridge', 'glutes'),
('ex-step-up', 'quads'), ('ex-step-up', 'glutes'),
('ex-box-jump', 'quads'), ('ex-box-jump', 'glutes'), ('ex-box-jump', 'calves');

-- Back exercises
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group) VALUES
('ex-deadlift', 'back'), ('ex-deadlift', 'hamstrings'), ('ex-deadlift', 'glutes'), ('ex-deadlift', 'traps'),
('ex-sumo-deadlift', 'back'), ('ex-sumo-deadlift', 'glutes'), ('ex-sumo-deadlift', 'quads'),
('ex-bent-row', 'back'), ('ex-bent-row', 'lats'), ('ex-bent-row', 'biceps'),
('ex-db-row', 'back'), ('ex-db-row', 'lats'), ('ex-db-row', 'biceps'),
('ex-pull-up', 'lats'), ('ex-pull-up', 'back'), ('ex-pull-up', 'biceps'),
('ex-chin-up', 'lats'), ('ex-chin-up', 'biceps'), ('ex-chin-up', 'back'),
('ex-lat-pulldown', 'lats'), ('ex-lat-pulldown', 'back'), ('ex-lat-pulldown', 'biceps'),
('ex-cable-row', 'back'), ('ex-cable-row', 'lats'), ('ex-cable-row', 'biceps'),
('ex-t-bar-row', 'back'), ('ex-t-bar-row', 'lats'), ('ex-t-bar-row', 'biceps'),
('ex-machine-row', 'back'), ('ex-machine-row', 'biceps'),
('ex-back-extension', 'lower-back'), ('ex-back-extension', 'glutes'), ('ex-back-extension', 'hamstrings'),
('ex-good-morning', 'lower-back'), ('ex-good-morning', 'hamstrings'), ('ex-good-morning', 'glutes');

-- Shoulder exercises
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group) VALUES
('ex-ohp', 'shoulders'), ('ex-ohp', 'triceps'),
('ex-db-shoulder-press', 'shoulders'), ('ex-db-shoulder-press', 'triceps'),
('ex-lateral-raise', 'shoulders'),
('ex-front-raise', 'shoulders'),
('ex-rear-delt-fly', 'shoulders'), ('ex-rear-delt-fly', 'back'),
('ex-face-pull', 'shoulders'), ('ex-face-pull', 'traps'), ('ex-face-pull', 'back'),
('ex-shrug', 'traps'),
('ex-machine-shoulder-press', 'shoulders'), ('ex-machine-shoulder-press', 'triceps'),
('ex-upright-row', 'shoulders'), ('ex-upright-row', 'traps'),
('ex-arnold-press', 'shoulders'), ('ex-arnold-press', 'triceps'),
('ex-cable-lateral-raise', 'shoulders'),
('ex-reverse-fly-machine', 'shoulders'), ('ex-reverse-fly-machine', 'back');

-- Arm exercises
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group) VALUES
('ex-barbell-curl', 'biceps'),
('ex-db-curl', 'biceps'),
('ex-hammer-curl', 'biceps'), ('ex-hammer-curl', 'forearms'),
('ex-preacher-curl', 'biceps'),
('ex-cable-curl', 'biceps'),
('ex-tricep-pushdown', 'triceps'),
('ex-skull-crusher', 'triceps'),
('ex-overhead-ext', 'triceps'),
('ex-close-grip-bench', 'triceps'), ('ex-close-grip-bench', 'chest'),
('ex-wrist-curl', 'forearms'),
('ex-concentration-curl', 'biceps'),
('ex-incline-curl', 'biceps'),
('ex-diamond-pushup', 'triceps'), ('ex-diamond-pushup', 'chest'),
('ex-tricep-dip', 'triceps');

-- Core exercises
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group) VALUES
('ex-crunch', 'abs'),
('ex-plank', 'abs'), ('ex-plank', 'obliques'),
('ex-hanging-leg-raise', 'abs'),
('ex-cable-crunch', 'abs'),
('ex-russian-twist', 'obliques'), ('ex-russian-twist', 'abs'),
('ex-ab-wheel', 'abs'),
('ex-mountain-climber', 'abs'), ('ex-mountain-climber', 'obliques');

-- Other exercises
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group) VALUES
('ex-kettlebell-swing', 'glutes'), ('ex-kettlebell-swing', 'hamstrings'), ('ex-kettlebell-swing', 'lower-back'),
('ex-farmers-walk', 'forearms'), ('ex-farmers-walk', 'traps'), ('ex-farmers-walk', 'abs');

-- Insert equipment for exercises
-- Chest exercises
INSERT INTO exercise_equipment (exercise_id, equipment) VALUES
('ex-bench-press', 'barbell'), ('ex-bench-press', 'bench'),
('ex-incline-bench', 'barbell'), ('ex-incline-bench', 'bench'),
('ex-db-bench', 'dumbbell'), ('ex-db-bench', 'bench'),
('ex-db-incline-bench', 'dumbbell'), ('ex-db-incline-bench', 'bench'),
('ex-chest-fly', 'dumbbell'), ('ex-chest-fly', 'bench'),
('ex-cable-fly', 'cable'),
('ex-push-up', 'bodyweight'),
('ex-dip', 'dip-station'),
('ex-machine-chest-press', 'machine'),
('ex-pec-deck', 'machine');

-- Leg exercises
INSERT INTO exercise_equipment (exercise_id, equipment) VALUES
('ex-squat', 'barbell'),
('ex-front-squat', 'barbell'),
('ex-goblet-squat', 'dumbbell'), ('ex-goblet-squat', 'kettlebell'),
('ex-leg-press', 'machine'),
('ex-lunges', 'dumbbell'), ('ex-lunges', 'bodyweight'),
('ex-leg-extension', 'machine'),
('ex-leg-curl', 'machine'),
('ex-romanian-dl', 'barbell'), ('ex-romanian-dl', 'dumbbell'),
('ex-calf-raise', 'machine'), ('ex-calf-raise', 'bodyweight'),
('ex-seated-calf', 'machine'),
('ex-hack-squat', 'machine'),
('ex-bulgarian-split', 'dumbbell'), ('ex-bulgarian-split', 'bodyweight'),
('ex-smith-squat', 'smith-machine'),
('ex-hip-thrust', 'barbell'), ('ex-hip-thrust', 'bench'),
('ex-glute-bridge', 'bodyweight'),
('ex-step-up', 'dumbbell'), ('ex-step-up', 'bench'),
('ex-box-jump', 'bodyweight');

-- Back exercises
INSERT INTO exercise_equipment (exercise_id, equipment) VALUES
('ex-deadlift', 'barbell'),
('ex-sumo-deadlift', 'barbell'),
('ex-bent-row', 'barbell'),
('ex-db-row', 'dumbbell'), ('ex-db-row', 'bench'),
('ex-pull-up', 'pull-up-bar'),
('ex-chin-up', 'pull-up-bar'),
('ex-lat-pulldown', 'cable'),
('ex-cable-row', 'cable'),
('ex-t-bar-row', 'barbell'),
('ex-machine-row', 'machine'),
('ex-back-extension', 'bodyweight'), ('ex-back-extension', 'machine'),
('ex-good-morning', 'barbell');

-- Shoulder exercises
INSERT INTO exercise_equipment (exercise_id, equipment) VALUES
('ex-ohp', 'barbell'),
('ex-db-shoulder-press', 'dumbbell'),
('ex-lateral-raise', 'dumbbell'),
('ex-front-raise', 'dumbbell'),
('ex-rear-delt-fly', 'dumbbell'),
('ex-face-pull', 'cable'),
('ex-shrug', 'barbell'), ('ex-shrug', 'dumbbell'),
('ex-machine-shoulder-press', 'machine'),
('ex-upright-row', 'barbell'), ('ex-upright-row', 'dumbbell'), ('ex-upright-row', 'cable'),
('ex-arnold-press', 'dumbbell'),
('ex-cable-lateral-raise', 'cable'),
('ex-reverse-fly-machine', 'machine');

-- Arm exercises
INSERT INTO exercise_equipment (exercise_id, equipment) VALUES
('ex-barbell-curl', 'barbell'), ('ex-barbell-curl', 'ez-bar'),
('ex-db-curl', 'dumbbell'),
('ex-hammer-curl', 'dumbbell'),
('ex-preacher-curl', 'barbell'), ('ex-preacher-curl', 'ez-bar'), ('ex-preacher-curl', 'dumbbell'),
('ex-cable-curl', 'cable'),
('ex-tricep-pushdown', 'cable'),
('ex-skull-crusher', 'barbell'), ('ex-skull-crusher', 'ez-bar'), ('ex-skull-crusher', 'dumbbell'),
('ex-overhead-ext', 'dumbbell'), ('ex-overhead-ext', 'cable'),
('ex-close-grip-bench', 'barbell'), ('ex-close-grip-bench', 'bench'),
('ex-wrist-curl', 'barbell'), ('ex-wrist-curl', 'dumbbell'),
('ex-concentration-curl', 'dumbbell'),
('ex-incline-curl', 'dumbbell'), ('ex-incline-curl', 'bench'),
('ex-diamond-pushup', 'bodyweight'),
('ex-tricep-dip', 'bench');

-- Core exercises
INSERT INTO exercise_equipment (exercise_id, equipment) VALUES
('ex-crunch', 'bodyweight'),
('ex-plank', 'bodyweight'),
('ex-hanging-leg-raise', 'pull-up-bar'),
('ex-cable-crunch', 'cable'),
('ex-russian-twist', 'bodyweight'), ('ex-russian-twist', 'dumbbell'),
('ex-ab-wheel', 'bodyweight'),
('ex-mountain-climber', 'bodyweight');

-- Other exercises
INSERT INTO exercise_equipment (exercise_id, equipment) VALUES
('ex-kettlebell-swing', 'kettlebell'),
('ex-farmers-walk', 'dumbbell'), ('ex-farmers-walk', 'kettlebell');
