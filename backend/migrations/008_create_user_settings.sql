-- Create settings types
CREATE TYPE weight_unit AS ENUM ('kg', 'lbs');
CREATE TYPE measurement_unit AS ENUM ('cm', 'in');
CREATE TYPE theme AS ENUM ('light', 'dark', 'system');

-- Create user settings table
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    weight_unit weight_unit NOT NULL DEFAULT 'kg',
    measurement_unit measurement_unit NOT NULL DEFAULT 'cm',
    theme theme NOT NULL DEFAULT 'system',
    default_rest_timer INTEGER NOT NULL DEFAULT 90,
    auto_start_rest_timer BOOLEAN NOT NULL DEFAULT true,
    show_warmup_sets BOOLEAN NOT NULL DEFAULT true,
    vibrate_on_timer_end BOOLEAN NOT NULL DEFAULT true,
    sound_on_timer_end BOOLEAN NOT NULL DEFAULT true
);
