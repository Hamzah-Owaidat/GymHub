-- Add working hours, working days, and contact info to gyms

ALTER TABLE gyms
    ADD COLUMN working_hours VARCHAR(255) NULL AFTER location,
    ADD COLUMN working_days VARCHAR(100) NULL AFTER working_hours,
    ADD COLUMN phone VARCHAR(30) NULL AFTER working_days,
    ADD COLUMN email VARCHAR(120) NULL AFTER phone;

