-- ============================================================
-- Trap Bar exercises
-- ============================================================
INSERT INTO exercise_templates (id, name, category, is_custom, description, instructions) VALUES
('ex-trap-bar-deadlift', 'Trap Bar Deadlift', 'strength', false,
 'Deadlift variation using a hex/trap bar — more quad-dominant and easier on the lower back than a conventional deadlift',
 ARRAY['Step inside the trap bar, feet hip-width apart', 'Grip the handles at your sides', 'Keep chest up and back flat', 'Drive through the floor to stand tall', 'Lower under control']),
('ex-trap-bar-shrug', 'Trap Bar Shrug', 'strength', false,
 'Trap bar shrug — neutral grip reduces wrist stress compared to a barbell shrug', NULL),
('ex-trap-bar-carry', 'Trap Bar Farmer''s Carry', 'strength', false,
 'Loaded carry with a trap bar — improves grip strength, stability, and full-body conditioning', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Core exercises (more)
-- ============================================================
INSERT INTO exercise_templates (id, name, category, is_custom, description, instructions) VALUES
('ex-copenhagen-plank', 'Copenhagen Plank', 'bodyweight', false,
 'Side plank variation with the top leg elevated — one of the best adductor strengthening exercises',
 ARRAY['Set up in a side plank with top foot resting on a bench or box', 'Lift hips off the ground, forming a straight line from head to foot', 'Hold or perform reps by lowering and raising hips', 'Keep the bottom leg lifted off the floor for added challenge']),
('ex-side-plank', 'Side Plank', 'bodyweight', false,
 'Lateral core stability exercise targeting the obliques and hip abductors', NULL),
('ex-dead-bug', 'Dead Bug', 'bodyweight', false,
 'Anti-extension core exercise that builds stability and contralateral coordination',
 ARRAY['Lie on your back, arms pointing to ceiling, knees bent at 90°', 'Lower opposite arm and leg toward the floor simultaneously', 'Keep lower back pressed into the floor throughout', 'Return and repeat on the other side']),
('ex-pallof-press', 'Pallof Press', 'strength', false,
 'Anti-rotation core exercise performed with a cable — trains the core to resist rotational forces', NULL),
('ex-toes-to-bar', 'Toes to Bar', 'bodyweight', false,
 'Hanging core exercise targeting the abs and hip flexors — harder progression from hanging leg raise', NULL),
('ex-dragon-flag', 'Dragon Flag', 'bodyweight', false,
 'Advanced full-body core exercise popularised by Bruce Lee — requires significant core and hip flexor strength', NULL),
('ex-bicycle-crunch', 'Bicycle Crunch', 'bodyweight', false,
 'Rotational crunch targeting both the rectus abdominis and obliques', NULL),
('ex-l-sit', 'L-Sit', 'bodyweight', false,
 'Isometric hold with legs parallel to the floor — builds core, hip flexor, and tricep strength', NULL),
('ex-hollow-body-hold', 'Hollow Body Hold', 'bodyweight', false,
 'Foundational gymnastic core exercise — maintains a posterior pelvic tilt under load', NULL),
('ex-windmill', 'Kettlebell Windmill', 'strength', false,
 'Rotational hip-hinge movement that builds lateral flexion strength and hip mobility', NULL),
('ex-hanging-knee-raise', 'Hanging Knee Raise', 'bodyweight', false,
 'Entry-level hanging ab exercise — easier regression of the hanging leg raise', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Leg exercises (more)
-- ============================================================
INSERT INTO exercise_templates (id, name, category, is_custom, description, instructions) VALUES
('ex-adductor-machine', 'Adductor Machine', 'strength', false,
 'Machine isolation exercise for the inner thighs', NULL),
('ex-abductor-machine', 'Abductor Machine', 'strength', false,
 'Machine isolation exercise for the hip abductors (outer glutes / glute medius)', NULL),
('ex-nordic-curl', 'Nordic Hamstring Curl', 'bodyweight', false,
 'Eccentric hamstring exercise with strong injury-prevention evidence; requires anchored feet',
 ARRAY['Kneel on a pad with feet anchored', 'Keeping hips extended, lower your torso toward the floor by extending your knees', 'Control the descent as slowly as possible', 'Use hands to push back up to start if needed']),
('ex-glute-ham-raise', 'Glute Ham Raise', 'strength', false,
 'Posterior chain exercise on a GHR machine — trains both knee flexion and hip extension simultaneously', NULL),
('ex-reverse-hyper', 'Reverse Hyperextension', 'strength', false,
 'Machine or table exercise that targets the glutes, hamstrings, and spinal erectors while decompressing the spine', NULL),
('ex-sl-rdl', 'Single Leg Romanian Deadlift', 'strength', false,
 'Unilateral hip hinge that exposes and corrects left-right strength imbalances', NULL),
('ex-cable-adduction', 'Cable Hip Adduction', 'strength', false,
 'Cable isolation exercise for the inner thighs', NULL),
('ex-cable-abduction', 'Cable Hip Abduction', 'strength', false,
 'Cable isolation exercise for the glute medius and hip abductors', NULL),
('ex-deficit-deadlift', 'Deficit Deadlift', 'strength', false,
 'Deadlift performed while standing on a small platform — increases range of motion and builds strength off the floor', NULL),
('ex-stiff-leg-dl', 'Stiff-Leg Deadlift', 'strength', false,
 'Hip hinge with minimal knee bend — heavily loads the hamstrings through a long range of motion', NULL),
('ex-leg-press-calf', 'Leg Press Calf Raise', 'strength', false,
 'Calf raise performed on the leg press — allows heavy loading with a stable spine', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Back exercises (more)
-- ============================================================
INSERT INTO exercise_templates (id, name, category, is_custom, description, instructions) VALUES
('ex-rack-pull', 'Rack Pull', 'strength', false,
 'Partial-range deadlift starting from knee height — useful for overloading the top half of the pull and training lockout', NULL),
('ex-pendlay-row', 'Pendlay Row', 'strength', false,
 'Strict barbell row where the bar returns to the floor between reps — emphasises explosive upper back strength',
 ARRAY['Bar on the floor, torso parallel to the ground', 'Explosively row the bar to your lower chest', 'Lower the bar back to the floor with control', 'Reset and repeat']),
('ex-straight-arm-pulldown', 'Straight Arm Pulldown', 'strength', false,
 'Cable lat isolation exercise — keeps the lats under constant tension through a long arc', NULL),
('ex-incline-db-row', 'Incline Dumbbell Row', 'strength', false,
 'Chest-supported row on an incline bench — removes lower back involvement for strict lat work', NULL),
('ex-chest-supported-row', 'Chest Supported Row', 'strength', false,
 'Machine or bench-supported row that eliminates lower back recruitment', NULL),
('ex-cable-pullover', 'Cable Pullover', 'strength', false,
 'Standing cable pullover for lat isolation — constant tension version of the dumbbell pullover', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Shoulder exercises (more)
-- ============================================================
INSERT INTO exercise_templates (id, name, category, is_custom, description, instructions) VALUES
('ex-landmine-press', 'Landmine Press', 'strength', false,
 'Pressing movement using a landmine attachment — shoulder-friendly arc of motion, great for shoulder stability', NULL),
('ex-cable-front-raise', 'Cable Front Raise', 'strength', false,
 'Front delt isolation with constant cable tension', NULL),
('ex-band-pull-apart', 'Band Pull Apart', 'strength', false,
 'Resistance band exercise for rear delts and upper back — commonly used as a warm-up or accessory movement', NULL),
('ex-pike-push-up', 'Pike Push-Up', 'bodyweight', false,
 'Bodyweight shoulder press variation with hips elevated — good progression toward a handstand push-up', NULL),
('ex-db-shrug', 'Dumbbell Shrug', 'strength', false,
 'Dumbbell shrug — neutral hand position reduces wrist torque', NULL),
('ex-behind-neck-press', 'Behind the Neck Press', 'strength', false,
 'Overhead press variant with the bar behind the neck — increases lateral delt involvement; requires good shoulder mobility', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Chest exercises (more)
-- ============================================================
INSERT INTO exercise_templates (id, name, category, is_custom, description, instructions) VALUES
('ex-decline-bench', 'Decline Barbell Bench Press', 'strength', false,
 'Decline angle shifts emphasis to the lower chest fibres', NULL),
('ex-decline-db-bench', 'Decline Dumbbell Bench Press', 'strength', false,
 'Dumbbell version of the decline press — greater range of motion', NULL),
('ex-low-cable-fly', 'Low Cable Fly', 'strength', false,
 'Cable fly with pulleys set low — targets the upper chest through an upward arc', NULL),
('ex-high-cable-fly', 'High Cable Fly', 'strength', false,
 'Cable fly with pulleys set high — targets the lower chest through a downward arc', NULL),
('ex-svend-press', 'Svend Press', 'strength', false,
 'Chest isolation exercise pressing two plates together in front of the chest — constant medial chest squeeze', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Arm exercises (more)
-- ============================================================
INSERT INTO exercise_templates (id, name, category, is_custom, description, instructions) VALUES
('ex-spider-curl', 'Spider Curl', 'strength', false,
 'Bicep curl performed chest-down on an incline bench — removes body momentum and maximises peak contraction', NULL),
('ex-reverse-curl', 'Reverse Barbell Curl', 'strength', false,
 'Pronated grip curl — heavily loads the brachialis and forearm extensors', NULL),
('ex-cable-overhead-ext', 'Cable Overhead Tricep Extension', 'strength', false,
 'Tricep long-head isolation with the cable overhead — maximum stretch position', NULL),
('ex-drag-curl', 'Drag Curl', 'strength', false,
 'Bicep curl variation where the bar is dragged up the torso — eliminates front delt involvement', NULL),
('ex-jm-press', 'JM Press', 'strength', false,
 'Hybrid between a close-grip bench and a skull crusher — excellent tricep builder with heavy loads', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Functional / Power exercises
-- ============================================================
INSERT INTO exercise_templates (id, name, category, is_custom, description, instructions) VALUES
('ex-power-clean', 'Power Clean', 'strength', false,
 'Olympic weightlifting pull — develops explosive full-body power',
 ARRAY['Start with bar over mid-foot, hip-width stance', 'First pull: extend legs while keeping back angle constant', 'Second pull: explosive hip extension, shrug, and pull elbows high', 'Receive bar in a quarter-squat (power position)', 'Stand to full extension']),
('ex-kb-turkish-getup', 'Kettlebell Turkish Get-Up', 'strength', false,
 'Full-body movement combining a floor-to-stand sequence with a locked-out kettlebell overhead — builds shoulder stability, mobility, and core control', NULL),
('ex-kb-snatch', 'Kettlebell Snatch', 'strength', false,
 'Single-arm overhead power movement with a kettlebell — combines hip hinge and overhead press', NULL),
('ex-kb-clean-press', 'Kettlebell Clean and Press', 'strength', false,
 'Combination clean + overhead press with a kettlebell — full-body conditioning exercise', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Muscle group associations
-- ============================================================

-- Trap Bar
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group) VALUES
('ex-trap-bar-deadlift', 'quads'), ('ex-trap-bar-deadlift', 'hamstrings'),
('ex-trap-bar-deadlift', 'glutes'), ('ex-trap-bar-deadlift', 'back'),
('ex-trap-bar-deadlift', 'traps'),
('ex-trap-bar-shrug', 'traps'),
('ex-trap-bar-carry', 'forearms'), ('ex-trap-bar-carry', 'traps'), ('ex-trap-bar-carry', 'abs')
ON CONFLICT DO NOTHING;

-- Core
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group) VALUES
('ex-copenhagen-plank', 'adductors'), ('ex-copenhagen-plank', 'abs'), ('ex-copenhagen-plank', 'obliques'),
('ex-side-plank', 'obliques'), ('ex-side-plank', 'abs'),
('ex-dead-bug', 'abs'),
('ex-pallof-press', 'abs'), ('ex-pallof-press', 'obliques'),
('ex-toes-to-bar', 'abs'),
('ex-dragon-flag', 'abs'),
('ex-bicycle-crunch', 'abs'), ('ex-bicycle-crunch', 'obliques'),
('ex-l-sit', 'abs'),
('ex-hollow-body-hold', 'abs'),
('ex-windmill', 'obliques'), ('ex-windmill', 'shoulders'),
('ex-hanging-knee-raise', 'abs')
ON CONFLICT DO NOTHING;

-- Legs
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group) VALUES
('ex-adductor-machine', 'adductors'),
('ex-abductor-machine', 'glutes'),
('ex-nordic-curl', 'hamstrings'),
('ex-glute-ham-raise', 'hamstrings'), ('ex-glute-ham-raise', 'glutes'),
('ex-reverse-hyper', 'glutes'), ('ex-reverse-hyper', 'hamstrings'), ('ex-reverse-hyper', 'lower-back'),
('ex-sl-rdl', 'hamstrings'), ('ex-sl-rdl', 'glutes'),
('ex-cable-adduction', 'adductors'),
('ex-cable-abduction', 'glutes'),
('ex-deficit-deadlift', 'back'), ('ex-deficit-deadlift', 'hamstrings'),
('ex-deficit-deadlift', 'glutes'), ('ex-deficit-deadlift', 'quads'),
('ex-stiff-leg-dl', 'hamstrings'), ('ex-stiff-leg-dl', 'glutes'), ('ex-stiff-leg-dl', 'lower-back'),
('ex-leg-press-calf', 'calves')
ON CONFLICT DO NOTHING;

-- Back
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group) VALUES
('ex-rack-pull', 'back'), ('ex-rack-pull', 'traps'), ('ex-rack-pull', 'lower-back'),
('ex-pendlay-row', 'back'), ('ex-pendlay-row', 'lats'), ('ex-pendlay-row', 'biceps'),
('ex-straight-arm-pulldown', 'lats'), ('ex-straight-arm-pulldown', 'back'),
('ex-incline-db-row', 'back'), ('ex-incline-db-row', 'lats'), ('ex-incline-db-row', 'biceps'),
('ex-chest-supported-row', 'back'), ('ex-chest-supported-row', 'lats'), ('ex-chest-supported-row', 'biceps'),
('ex-cable-pullover', 'lats'), ('ex-cable-pullover', 'chest')
ON CONFLICT DO NOTHING;

-- Shoulders
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group) VALUES
('ex-landmine-press', 'shoulders'), ('ex-landmine-press', 'triceps'), ('ex-landmine-press', 'chest'),
('ex-cable-front-raise', 'shoulders'),
('ex-band-pull-apart', 'shoulders'), ('ex-band-pull-apart', 'back'),
('ex-pike-push-up', 'shoulders'), ('ex-pike-push-up', 'triceps'),
('ex-db-shrug', 'traps'),
('ex-behind-neck-press', 'shoulders'), ('ex-behind-neck-press', 'traps'), ('ex-behind-neck-press', 'triceps')
ON CONFLICT DO NOTHING;

-- Chest
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group) VALUES
('ex-decline-bench', 'chest'), ('ex-decline-bench', 'triceps'),
('ex-decline-db-bench', 'chest'), ('ex-decline-db-bench', 'triceps'),
('ex-low-cable-fly', 'chest'),
('ex-high-cable-fly', 'chest'),
('ex-svend-press', 'chest')
ON CONFLICT DO NOTHING;

-- Arms
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group) VALUES
('ex-spider-curl', 'biceps'),
('ex-reverse-curl', 'forearms'), ('ex-reverse-curl', 'biceps'),
('ex-cable-overhead-ext', 'triceps'),
('ex-drag-curl', 'biceps'),
('ex-jm-press', 'triceps'), ('ex-jm-press', 'chest')
ON CONFLICT DO NOTHING;

-- Functional / Power
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group) VALUES
('ex-power-clean', 'back'), ('ex-power-clean', 'shoulders'), ('ex-power-clean', 'quads'),
('ex-power-clean', 'glutes'), ('ex-power-clean', 'calves'), ('ex-power-clean', 'traps'),
('ex-kb-turkish-getup', 'shoulders'), ('ex-kb-turkish-getup', 'abs'),
('ex-kb-turkish-getup', 'glutes'), ('ex-kb-turkish-getup', 'triceps'),
('ex-kb-snatch', 'glutes'), ('ex-kb-snatch', 'hamstrings'),
('ex-kb-snatch', 'shoulders'), ('ex-kb-snatch', 'traps'),
('ex-kb-clean-press', 'shoulders'), ('ex-kb-clean-press', 'glutes'),
('ex-kb-clean-press', 'quads'), ('ex-kb-clean-press', 'triceps')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Equipment associations
-- ============================================================

-- Trap Bar
INSERT INTO exercise_equipment (exercise_id, equipment) VALUES
('ex-trap-bar-deadlift', 'trap-bar'),
('ex-trap-bar-shrug', 'trap-bar'),
('ex-trap-bar-carry', 'trap-bar')
ON CONFLICT DO NOTHING;

-- Core
INSERT INTO exercise_equipment (exercise_id, equipment) VALUES
('ex-copenhagen-plank', 'bodyweight'), ('ex-copenhagen-plank', 'bench'),
('ex-side-plank', 'bodyweight'),
('ex-dead-bug', 'bodyweight'),
('ex-pallof-press', 'cable'),
('ex-toes-to-bar', 'pull-up-bar'),
('ex-dragon-flag', 'bodyweight'), ('ex-dragon-flag', 'bench'),
('ex-bicycle-crunch', 'bodyweight'),
('ex-l-sit', 'bodyweight'), ('ex-l-sit', 'dip-station'),
('ex-hollow-body-hold', 'bodyweight'),
('ex-windmill', 'kettlebell'), ('ex-windmill', 'dumbbell'),
('ex-hanging-knee-raise', 'pull-up-bar')
ON CONFLICT DO NOTHING;

-- Legs
INSERT INTO exercise_equipment (exercise_id, equipment) VALUES
('ex-adductor-machine', 'machine'),
('ex-abductor-machine', 'machine'),
('ex-nordic-curl', 'bodyweight'),
('ex-glute-ham-raise', 'machine'),
('ex-reverse-hyper', 'machine'),
('ex-sl-rdl', 'dumbbell'), ('ex-sl-rdl', 'barbell'), ('ex-sl-rdl', 'kettlebell'),
('ex-cable-adduction', 'cable'),
('ex-cable-abduction', 'cable'),
('ex-deficit-deadlift', 'barbell'),
('ex-stiff-leg-dl', 'barbell'), ('ex-stiff-leg-dl', 'dumbbell'),
('ex-leg-press-calf', 'machine')
ON CONFLICT DO NOTHING;

-- Back
INSERT INTO exercise_equipment (exercise_id, equipment) VALUES
('ex-rack-pull', 'barbell'),
('ex-pendlay-row', 'barbell'),
('ex-straight-arm-pulldown', 'cable'),
('ex-incline-db-row', 'dumbbell'), ('ex-incline-db-row', 'bench'),
('ex-chest-supported-row', 'machine'), ('ex-chest-supported-row', 'dumbbell'), ('ex-chest-supported-row', 'bench'),
('ex-cable-pullover', 'cable')
ON CONFLICT DO NOTHING;

-- Shoulders
INSERT INTO exercise_equipment (exercise_id, equipment) VALUES
('ex-landmine-press', 'barbell'),
('ex-cable-front-raise', 'cable'),
('ex-band-pull-apart', 'resistance-band'),
('ex-pike-push-up', 'bodyweight'),
('ex-db-shrug', 'dumbbell'),
('ex-behind-neck-press', 'barbell')
ON CONFLICT DO NOTHING;

-- Chest
INSERT INTO exercise_equipment (exercise_id, equipment) VALUES
('ex-decline-bench', 'barbell'), ('ex-decline-bench', 'bench'),
('ex-decline-db-bench', 'dumbbell'), ('ex-decline-db-bench', 'bench'),
('ex-low-cable-fly', 'cable'),
('ex-high-cable-fly', 'cable'),
('ex-svend-press', 'barbell')
ON CONFLICT DO NOTHING;

-- Arms
INSERT INTO exercise_equipment (exercise_id, equipment) VALUES
('ex-spider-curl', 'barbell'), ('ex-spider-curl', 'ez-bar'), ('ex-spider-curl', 'dumbbell'),
('ex-reverse-curl', 'barbell'), ('ex-reverse-curl', 'ez-bar'),
('ex-cable-overhead-ext', 'cable'),
('ex-drag-curl', 'barbell'), ('ex-drag-curl', 'dumbbell'),
('ex-jm-press', 'barbell'), ('ex-jm-press', 'bench')
ON CONFLICT DO NOTHING;

-- Functional / Power
INSERT INTO exercise_equipment (exercise_id, equipment) VALUES
('ex-power-clean', 'barbell'),
('ex-kb-turkish-getup', 'kettlebell'),
('ex-kb-snatch', 'kettlebell'),
('ex-kb-clean-press', 'kettlebell')
ON CONFLICT DO NOTHING;
