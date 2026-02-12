-- Create workout templates table
CREATE TABLE workout_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_duration INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    usage_count INTEGER NOT NULL DEFAULT 0,
    tags TEXT[]
);

-- Create template exercises table
CREATE TABLE template_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    exercise_template_id VARCHAR(100) NOT NULL REFERENCES exercise_templates(id),
    exercise_name VARCHAR(255) NOT NULL,
    notes TEXT,
    rest_seconds INTEGER,
    order_index INTEGER NOT NULL DEFAULT 0
);

-- Create template sets table
CREATE TABLE template_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_exercise_id UUID NOT NULL REFERENCES template_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    target_reps INTEGER NOT NULL,
    target_weight DOUBLE PRECISION,
    is_warmup BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_workout_templates_user ON workout_templates(user_id);
CREATE INDEX idx_template_exercises_template ON template_exercises(template_id);
CREATE INDEX idx_template_sets_exercise ON template_sets(template_exercise_id);
