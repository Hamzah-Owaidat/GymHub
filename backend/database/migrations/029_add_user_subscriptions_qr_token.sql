ALTER TABLE user_subscriptions
  ADD COLUMN qr_token VARCHAR(64) NULL UNIQUE AFTER status;

CREATE INDEX idx_user_subscriptions_qr_token ON user_subscriptions (qr_token);
