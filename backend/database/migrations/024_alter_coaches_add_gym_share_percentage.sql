-- Gym owner share percentage from coach session price.
ALTER TABLE coaches
  ADD COLUMN gym_share_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER price_per_session;
