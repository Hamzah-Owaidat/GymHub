-- Add is_private flag to coach_availability to describe whether sessions in this slot are private by default.
ALTER TABLE coach_availability
  ADD COLUMN is_private TINYINT(1) NOT NULL DEFAULT 1 AFTER end_time;

