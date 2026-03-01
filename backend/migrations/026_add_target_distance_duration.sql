ALTER TABLE template_sets
  ADD COLUMN IF NOT EXISTS target_distance_meters INTEGER,
  ADD COLUMN IF NOT EXISTS target_duration_seconds INTEGER;

ALTER TABLE workout_sets
  ADD COLUMN IF NOT EXISTS target_distance_meters INTEGER,
  ADD COLUMN IF NOT EXISTS target_duration_seconds INTEGER;
