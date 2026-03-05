-- Make phone required for users.
-- Ensure existing NULL phones are set to empty string, then enforce NOT NULL with a default.

UPDATE users SET phone = '' WHERE phone IS NULL;

ALTER TABLE users
  MODIFY phone VARCHAR(30) NOT NULL DEFAULT '';

