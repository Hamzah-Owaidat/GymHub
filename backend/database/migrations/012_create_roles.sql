-- Roles: admin, owner, coach, user. Users table will reference role_id.
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO roles (name, description) VALUES
    ('admin', 'Full system access; creates owners'),
    ('owner', 'Manages own gyms and coaches'),
    ('coach', 'Manages sessions and availability at assigned gym'),
    ('user', 'Regular member: book sessions, subscriptions, rate gyms')
ON DUPLICATE KEY UPDATE description = VALUES(description);
