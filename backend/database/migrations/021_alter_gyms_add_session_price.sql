-- Per-session price for non-subscribed users. Gym owner sets this amount.
ALTER TABLE gyms
  ADD COLUMN session_price DECIMAL(10,2) NULL DEFAULT NULL AFTER email;
