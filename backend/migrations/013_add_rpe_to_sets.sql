ALTER TABLE workout_sets ADD COLUMN rpe SMALLINT CHECK (rpe >= 1 AND rpe <= 10);
