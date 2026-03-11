-- Add is_private flag to sessions to distinguish private vs public sessions.
ALTER TABLE sessions
  ADD COLUMN is_private TINYINT(1) NOT NULL DEFAULT 1 AFTER status;

