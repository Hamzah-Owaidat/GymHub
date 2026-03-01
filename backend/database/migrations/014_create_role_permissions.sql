-- Junction: which permissions each role has.
CREATE TABLE IF NOT EXISTS role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_role_permission (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Admin: all permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'admin' LIMIT 1), id FROM permissions;

-- Owner: gyms (full), coaches (full), subscription_plans (full), user_subscriptions (read/list), sessions (list/read), ratings (read/list/delete), notifications (read/update/list), payments (read/list)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN (
    'gyms:create','gyms:read','gyms:update','gyms:delete','gyms:list',
    'coaches:create','coaches:read','coaches:update','coaches:delete','coaches:list',
    'subscription_plans:create','subscription_plans:read','subscription_plans:update','subscription_plans:delete','subscription_plans:list',
    'user_subscriptions:read','user_subscriptions:list',
    'sessions:create','sessions:read','sessions:update','sessions:delete','sessions:list',
    'ratings:read','ratings:delete','ratings:list',
    'notifications:read','notifications:update','notifications:list',
    'payments:read','payments:list','payments:create',
    'users:read','users:list'
)
WHERE r.name = 'owner';

-- Coach: own profile, availability, sessions (create/read/update/list)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN (
    'users:read','users:update',
    'coaches:read','coaches:update','coach_availability:manage',
    'sessions:create','sessions:read','sessions:update','sessions:list',
    'gyms:read','notifications:read','notifications:update','notifications:list'
)
WHERE r.name = 'coach';

-- User: register, profile, gyms list/read, sessions book/list/read, subscriptions (own), ratings create/read/list, notifications, payments (own)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN (
    'users:read','users:update',
    'gyms:read','gyms:list',
    'coaches:read','coaches:list',
    'subscription_plans:read','subscription_plans:list',
    'user_subscriptions:create','user_subscriptions:read','user_subscriptions:list',
    'sessions:create','sessions:read','sessions:update','sessions:list',
    'ratings:create','ratings:read','ratings:list',
    'notifications:read','notifications:update','notifications:list',
    'payments:read','payments:list'
)
WHERE r.name = 'user';
