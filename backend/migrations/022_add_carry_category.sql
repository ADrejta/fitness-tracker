-- no-transaction
-- Add 'carry' exercise category (loaded carries: Farmer's Walk, Sled Push, etc.)
ALTER TYPE exercise_category ADD VALUE IF NOT EXISTS 'carry';
