const { pool } = require('../config/db');

const SELECT_USER_WITH_ROLE = `
  SELECT u.id, u.first_name, u.last_name, u.email, u.dob, u.phone, u.profile_image, u.is_active, u.created_at,
         r.name AS role, r.id AS role_id
  FROM users u
  JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL
  WHERE u.deleted_at IS NULL
`;

const SELECT_USER_WITH_PASSWORD = `
  SELECT u.id, u.first_name, u.last_name, u.email, u.password, u.dob, u.phone, u.profile_image, u.is_active,
         r.name AS role, r.id AS role_id
  FROM users u
  JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL
  WHERE u.deleted_at IS NULL
`;

/**
 * Find user by email. Optionally include password (for login).
 * @param {string} email
 * @param {{ includePassword?: boolean }} [opts]
 * @returns {Promise<object|null>} User row or null
 */
async function findByEmail(email, opts = {}) {
  const sql = opts.includePassword ? SELECT_USER_WITH_PASSWORD : SELECT_USER_WITH_ROLE;
  const clause = ' AND u.email = ? LIMIT 1';
  const [rows] = await pool.query(sql + clause, [email]);
  const row = rows[0] || null;
  return row ? formatUserRow(row, opts.includePassword) : null;
}

/**
 * Find user by id (with role). Returns null if not found.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  const [rows] = await pool.query(SELECT_USER_WITH_ROLE + ' AND u.id = ? LIMIT 1', [id]);
  const row = rows[0] || null;
  return row ? formatUserRow(row) : null;
}

/**
 * Create a user. Returns the new user id.
 * @param {object} data
 * @param {string} data.first_name
 * @param {string} data.last_name
 * @param {string} data.email
 * @param {string} data.passwordHash
 * @param {number} data.role_id
 * @param {string|null} [data.dob]
 * @param {string|null} [data.phone]
 * @param {number|null} [data.created_by]
 * @returns {Promise<number>} insertId
 */
async function create(data) {
  const {
    first_name,
    last_name,
    email,
    passwordHash,
    role_id,
    dob = null,
    phone = null,
    created_by = null,
  } = data;
  const [result] = await pool.query(
    `INSERT INTO users (first_name, last_name, email, password, role_id, is_active, created_by, dob, phone)
     VALUES (?, ?, ?, ?, ?, TRUE, ?, ?, ?)`,
    [first_name, last_name, email, passwordHash, role_id, created_by, dob, phone]
  );
  return result.insertId;
}

/**
 * Get role id by role name.
 * @param {string} name - e.g. 'user', 'admin'
 * @returns {Promise<number|null>}
 */
async function getRoleIdByName(name) {
  const [rows] = await pool.query(
    'SELECT id FROM roles WHERE name = ? AND deleted_at IS NULL LIMIT 1',
    [name]
  );
  return rows[0] ? rows[0].id : null;
}

/**
 * Check if email is already used by an active user.
 * @param {string} email
 * @returns {Promise<boolean>}
 */
async function existsByEmail(email) {
  const [rows] = await pool.query(
    'SELECT 1 FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1',
    [email]
  );
  return rows.length > 0;
}

function formatUserRow(row, includePassword = false) {
  const user = {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    dob: row.dob,
    phone: row.phone,
    profile_image: row.profile_image,
    is_active: !!row.is_active,
    role: row.role,
    role_id: row.role_id,
  };
  if (row.created_at) user.created_at = row.created_at;
  if (includePassword) user.password = row.password;
  return user;
}

module.exports = {
  findByEmail,
  findById,
  create,
  getRoleIdByName,
  existsByEmail,
};
