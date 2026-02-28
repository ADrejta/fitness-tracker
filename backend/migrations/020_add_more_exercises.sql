-- no-transaction
-- Add new enum values (must be committed before use — kept in a separate migration)
ALTER TYPE equipment ADD VALUE IF NOT EXISTS 'trap-bar';
ALTER TYPE muscle_group ADD VALUE IF NOT EXISTS 'adductors';
