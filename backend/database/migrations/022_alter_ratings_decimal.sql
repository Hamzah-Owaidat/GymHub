-- Allow half-star ratings (e.g. 3.5, 4.5) by changing INT to DECIMAL.
-- Also change rating_average on gyms to DECIMAL(3,1) for better precision.

-- MySQL uses DROP CHECK (not DROP CONSTRAINT IF EXISTS)
ALTER TABLE ratings
  DROP CHECK chk_rating_range;

ALTER TABLE ratings
  MODIFY COLUMN rating DECIMAL(2,1) NOT NULL;

ALTER TABLE ratings
  ADD CONSTRAINT chk_rating_range CHECK (rating >= 0.5 AND rating <= 5.0);

ALTER TABLE ratings
  ADD UNIQUE KEY uk_user_gym_rating (user_id, gym_id);

ALTER TABLE gyms
  MODIFY COLUMN rating_average DECIMAL(3,1) DEFAULT 0;
