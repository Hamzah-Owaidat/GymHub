-- Users: admin creates owners; owners/admins create coaches; users register themselves.
-- role stored as VARCHAR; allowed values in constants/roles.js
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(60) NOT NULL,
    last_name VARCHAR(60) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    dob DATE,
    phone_country_code VARCHAR(10) NOT NULL DEFAULT '',
    phone VARCHAR(30) NOT NULL DEFAULT '',
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    profile_image VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
