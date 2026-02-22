ALTER TABLE workouts ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE workout_templates ADD COLUMN deleted_at TIMESTAMPTZ;
