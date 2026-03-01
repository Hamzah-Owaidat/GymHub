-- Replace users.role (VARCHAR) with users.role_id (FK to roles).

-- Add new column (nullable first for backfill)
ALTER TABLE users ADD COLUMN role_id INT NULL AFTER password;
ALTER TABLE users ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;

-- Backfill from existing role name (if column still exists)
UPDATE users u
INNER JOIN roles r ON r.name = u.role
SET u.role_id = r.id
WHERE u.role IS NOT NULL;

-- Set default for any rows without role (e.g. 'user')
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'user' LIMIT 1) WHERE role_id IS NULL;

-- Drop old column and enforce NOT NULL
ALTER TABLE users DROP COLUMN role;
ALTER TABLE users MODIFY COLUMN role_id INT NOT NULL;
