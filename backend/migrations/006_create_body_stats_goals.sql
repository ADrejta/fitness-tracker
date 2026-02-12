-- Create goal types
CREATE TYPE goal_type AS ENUM ('weight', 'body-fat', 'measurement');

CREATE TYPE measurement_type AS ENUM (
    'weight', 'body_fat_percentage', 'chest', 'waist', 'hips',
    'left_bicep', 'right_bicep', 'left_thigh', 'right_thigh',
    'neck', 'shoulders', 'left_calf', 'right_calf',
    'left_forearm', 'right_forearm'
);

-- Create body stats goals table
CREATE TABLE body_stats_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_type goal_type NOT NULL,
    measurement_type measurement_type,
    target_value DOUBLE PRECISION NOT NULL,
    start_value DOUBLE PRECISION NOT NULL,
    start_date DATE NOT NULL,
    target_date DATE,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_body_stats_goals_user ON body_stats_goals(user_id);
