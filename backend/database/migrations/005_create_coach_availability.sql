-- Day values: see constants/days.js (sunday, monday, ...).
CREATE TABLE IF NOT EXISTS coach_availability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coach_id INT NOT NULL,
    day VARCHAR(20) NOT NULL,
    start_time TIME,
    end_time TIME,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE
);
