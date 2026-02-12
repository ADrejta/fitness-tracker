-- Create workout status type
CREATE TYPE workout_status AS ENUM ('in-progress', 'completed', 'cancelled');

-- Create workouts table
CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    total_volume DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_sets INTEGER NOT NULL DEFAULT 0,
    total_reps INTEGER NOT NULL DEFAULT 0,
    duration INTEGER,
    status workout_status NOT NULL DEFAULT 'in-progress',
    template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
    notes TEXT
);

-- Create workout exercises table
CREATE TABLE workout_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_template_id VARCHAR(100) NOT NULL REFERENCES exercise_templates(id),
    exercise_name VARCHAR(255) NOT NULL,
    notes TEXT,
    order_index INTEGER NOT NULL DEFAULT 0
);

-- Create workout sets table
CREATE TABLE workout_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    target_reps INTEGER,
    actual_reps INTEGER,
    target_weight DOUBLE PRECISION,
    actual_weight DOUBLE PRECISION,
    is_warmup BOOLEAN NOT NULL DEFAULT false,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_workouts_user ON workouts(user_id);
CREATE INDEX idx_workouts_status ON workouts(status);
CREATE INDEX idx_workouts_started_at ON workouts(started_at DESC);
CREATE INDEX idx_workout_exercises_workout ON workout_exercises(workout_id);
CREATE INDEX idx_workout_sets_exercise ON workout_sets(workout_exercise_id);
