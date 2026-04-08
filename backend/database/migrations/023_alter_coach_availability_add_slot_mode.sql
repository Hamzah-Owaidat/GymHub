-- Add slot_mode to support private_only/public_only/both booking policies.
ALTER TABLE coach_availability
  ADD COLUMN slot_mode VARCHAR(20) NOT NULL DEFAULT 'private_only' AFTER is_private;

-- Backfill from legacy is_private.
UPDATE coach_availability
SET slot_mode = CASE
  WHEN is_private = 1 THEN 'private_only'
  ELSE 'public_only'
END
WHERE slot_mode IS NULL OR slot_mode = '';
