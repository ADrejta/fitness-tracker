-- Add superset_id to workout_exercises
ALTER TABLE workout_exercises ADD COLUMN superset_id UUID;

-- Add superset_id to template_exercises
ALTER TABLE template_exercises ADD COLUMN superset_id UUID;

-- Index for efficient grouping queries
CREATE INDEX idx_workout_exercises_superset ON workout_exercises(superset_id) WHERE superset_id IS NOT NULL;
CREATE INDEX idx_template_exercises_superset ON template_exercises(superset_id) WHERE superset_id IS NOT NULL;
