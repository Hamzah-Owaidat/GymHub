ALTER TABLE users
  ADD COLUMN phone_country_code VARCHAR(10) NOT NULL DEFAULT '' AFTER dob;

