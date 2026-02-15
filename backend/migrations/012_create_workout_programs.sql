-- Create workout programs table
CREATE TABLE workout_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    duration_weeks INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    current_week INTEGER NOT NULL DEFAULT 1,
    current_day INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workout_programs_user ON workout_programs(user_id);
CREATE INDEX idx_workout_programs_active ON workout_programs(user_id, is_active);

-- Create program workouts table (individual workout slots within a program)
CREATE TABLE program_workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    day_number INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL,
    template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
    is_rest_day BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    completed_workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    UNIQUE(program_id, week_number, day_number)
);

CREATE INDEX idx_program_workouts_program ON program_workouts(program_id);
