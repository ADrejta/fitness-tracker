-- Create record type
CREATE TYPE record_type AS ENUM ('max-weight', 'max-reps', 'max-volume', 'estimated-1rm');

-- Create personal records table
CREATE TABLE personal_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_template_id VARCHAR(100) NOT NULL REFERENCES exercise_templates(id) ON DELETE CASCADE,
    exercise_name VARCHAR(255) NOT NULL,
    record_type record_type NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    reps INTEGER,
    achieved_at TIMESTAMPTZ NOT NULL,
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE
);

CREATE INDEX idx_personal_records_user ON personal_records(user_id);
CREATE INDEX idx_personal_records_exercise ON personal_records(exercise_template_id);
CREATE INDEX idx_personal_records_achieved ON personal_records(achieved_at DESC);
