-- Create custom types for exercises
CREATE TYPE muscle_group AS ENUM (
    'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
    'abs', 'obliques', 'quads', 'hamstrings', 'glutes', 'calves',
    'traps', 'lats', 'lower-back'
);

CREATE TYPE exercise_category AS ENUM ('strength', 'cardio', 'bodyweight');

CREATE TYPE equipment AS ENUM (
    'barbell', 'dumbbell', 'cable', 'machine', 'kettlebell', 'bodyweight',
    'resistance-band', 'ez-bar', 'smith-machine', 'pull-up-bar',
    'dip-station', 'bench', 'cardio-machine'
);

-- Create exercise templates table
CREATE TABLE exercise_templates (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category exercise_category NOT NULL,
    is_custom BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    instructions TEXT[],
    user_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- Junction tables for many-to-many relationships
CREATE TABLE exercise_muscle_groups (
    exercise_id VARCHAR(100) REFERENCES exercise_templates(id) ON DELETE CASCADE,
    muscle_group muscle_group NOT NULL,
    PRIMARY KEY (exercise_id, muscle_group)
);

CREATE TABLE exercise_equipment (
    exercise_id VARCHAR(100) REFERENCES exercise_templates(id) ON DELETE CASCADE,
    equipment equipment NOT NULL,
    PRIMARY KEY (exercise_id, equipment)
);

CREATE INDEX idx_exercise_templates_user ON exercise_templates(user_id);
CREATE INDEX idx_exercise_templates_category ON exercise_templates(category);
