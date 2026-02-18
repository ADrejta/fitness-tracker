-- Composite index for the most common workouts filter pattern:
-- WHERE user_id = $1 AND status = 'completed' [AND started_at >= $2]
-- Replaces the need to intersect individual indexes on user_id and status.
CREATE INDEX idx_workouts_user_status_started
    ON workouts(user_id, status, started_at DESC);

-- Index for workout_exercises filtered by exercise_template_id.
-- Used in statistics queries that join across exercises by template id.
CREATE INDEX idx_workout_exercises_template
    ON workout_exercises(exercise_template_id);

-- Composite index for personal record lookups.
-- Covers get_current_record (user_id + exercise + record_type)
-- and find_by_exercise (user_id + exercise).
CREATE INDEX idx_personal_records_user_exercise_type
    ON personal_records(user_id, exercise_template_id, record_type);
