-- Create body measurements table
CREATE TABLE body_measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weight DOUBLE PRECISION,
    body_fat_percentage DOUBLE PRECISION,
    chest DOUBLE PRECISION,
    waist DOUBLE PRECISION,
    hips DOUBLE PRECISION,
    left_bicep DOUBLE PRECISION,
    right_bicep DOUBLE PRECISION,
    left_thigh DOUBLE PRECISION,
    right_thigh DOUBLE PRECISION,
    neck DOUBLE PRECISION,
    shoulders DOUBLE PRECISION,
    left_calf DOUBLE PRECISION,
    right_calf DOUBLE PRECISION,
    left_forearm DOUBLE PRECISION,
    right_forearm DOUBLE PRECISION,
    notes TEXT,
    UNIQUE(user_id, date)
);

CREATE INDEX idx_body_measurements_user ON body_measurements(user_id);
CREATE INDEX idx_body_measurements_date ON body_measurements(date DESC);
