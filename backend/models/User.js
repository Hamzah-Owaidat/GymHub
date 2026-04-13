const { pool } = require('../config/db');

const SELECT_USER_WITH_ROLE = `
  SELECT u.id, u.first_name, u.last_name, u.email, u.dob, u.phone_country_code, u.phone, u.profile_image, u.is_active, u.created_at,
         r.name AS role, r.id AS role_id
  FROM users u
  JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL
  WHERE u.deleted_at IS NULL
`;

const SELECT_USER_WITH_PASSWORD = `
  SELECT u.id, u.first_name, u.last_name, u.email, u.password, u.dob, u.phone_country_code, u.phone, u.profile_image, u.is_active,
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
  const clause = ' AND LOWER(TRIM(u.email)) = LOWER(TRIM(?)) LIMIT 1';
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
 * List users with pagination and optional filters.
 * Filters:
 *  - search: matches first_name, last_name, email, phone
 *  - role_id
 *  - is_active
 */
async function list({ search, role_id, is_active, page = 1, limit = 20, sortBy = 'created_at', sortDir = 'desc' } = {}) {
  const allowedSort = new Set(['id', 'first_name', 'last_name', 'email', 'created_at']);
  const sortColumn = allowedSort.has(sortBy) ? sortBy : 'created_at';
  const direction = sortDir && sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const where = ['u.deleted_at IS NULL'];
  const params = [];

  if (search) {
    const like = `%${search}%`;
    where.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
    params.push(like, like, like, like);
  }
  if (role_id) {
    where.push('u.role_id = ?');
    params.push(role_id);
  }
  if (typeof is_active === 'boolean') {
    where.push('u.is_active = ?');
    params.push(is_active ? 1 : 0);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM users u
    JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL
    ${whereSql}
  `;
  const [countRows] = await pool.query(countSql, params);
  const total = countRows[0] ? countRows[0].total : 0;

  const listSql = `
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.dob,
      u.phone_country_code,
      u.phone,
      u.profile_image,
      u.is_active,
      u.created_at,
      r.name AS role,
      r.id AS role_id
    FROM users u
    JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL
    ${whereSql}
    ORDER BY u.${sortColumn} ${direction}
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(listSql, [...params, Number(limit), offset]);
  const data = rows.map((row) => formatUserRow(row));

  return {
    data,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)) || 0,
    },
  };
}

/**
 * List all users (no pagination) – for exports.
 */
async function listAll({ search, role_id, is_active, sortBy = 'created_at', sortDir = 'desc' } = {}) {
  const allowedSort = new Set(['id', 'first_name', 'last_name', 'email', 'created_at']);
  const sortColumn = allowedSort.has(sortBy) ? sortBy : 'created_at';
  const direction = sortDir && sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const where = ['u.deleted_at IS NULL'];
  const params = [];

  if (search) {
    const like = `%${search}%`;
    where.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
    params.push(like, like, like, like);
  }
  if (role_id) {
    where.push('u.role_id = ?');
    params.push(role_id);
  }
  if (typeof is_active === 'boolean') {
    where.push('u.is_active = ?');
    params.push(is_active ? 1 : 0);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.dob,
      u.phone_country_code,
      u.phone,
      u.profile_image,
      u.is_active,
      u.created_at,
      r.name AS role,
      r.id AS role_id
    FROM users u
    JOIN roles r ON r.id = u.role_id AND r.deleted_at IS NULL
    ${whereSql}
    ORDER BY u.${sortColumn} ${direction}
  `;

  const [rows] = await pool.query(sql, params);
  return rows.map((row) => formatUserRow(row));
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
 * @param {string} [data.phone_country_code]
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
    phone_country_code = '',
    phone = '',
    created_by = null,
  } = data;
  const [result] = await pool.query(
    `INSERT INTO users (first_name, last_name, email, password, role_id, is_active, created_by, dob, phone_country_code, phone)
     VALUES (?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?)`,
    [first_name, last_name, email, passwordHash, role_id, created_by, dob, phone_country_code, phone]
  );
  return result.insertId;
}

/**
 * Update user fields (no password change here).
 * Accepts partial fields in `data`.
 */
async function update(id, data) {
  const fields = [];
  const params = [];

  if (data.first_name !== undefined) {
    fields.push('first_name = ?');
    params.push(data.first_name);
  }
  if (data.last_name !== undefined) {
    fields.push('last_name = ?');
    params.push(data.last_name);
  }
  if (data.email !== undefined) {
    fields.push('email = ?');
    params.push(data.email);
  }
  if (data.role_id !== undefined) {
    fields.push('role_id = ?');
    params.push(data.role_id);
  }
  if (data.dob !== undefined) {
    fields.push('dob = ?');
    params.push(data.dob);
  }
  if (data.phone_country_code !== undefined) {
    fields.push('phone_country_code = ?');
    params.push(data.phone_country_code);
  }
  if (data.phone !== undefined) {
    fields.push('phone = ?');
    params.push(data.phone);
  }
  if (data.is_active !== undefined) {
    fields.push('is_active = ?');
    params.push(data.is_active ? 1 : 0);
  }

  if (!fields.length) return false;

  params.push(id);

  const [result] = await pool.query(
    `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = ? AND deleted_at IS NULL
    `,
    params
  );
  return result.affectedRows > 0;
}

/**
 * Soft delete user.
 */
async function softDelete(id) {
  const [result] = await pool.query(
    `
      UPDATE users
      SET deleted_at = NOW(), is_active = FALSE
      WHERE id = ? AND deleted_at IS NULL
    `,
    [id]
  );
  return result.affectedRows > 0;
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
    'SELECT 1 FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) AND deleted_at IS NULL LIMIT 1',
    [email]
  );
  return rows.length > 0;
}

async function updatePasswordById(id, passwordHash) {
  const [result] = await pool.query(
    `UPDATE users
     SET password = ?, updated_at = NOW()
     WHERE id = ? AND deleted_at IS NULL`,
    [passwordHash, id],
  );
  return result.affectedRows > 0;
}

function formatUserRow(row, includePassword = false) {
  const user = {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    dob: row.dob,
    phone_country_code: row.phone_country_code,
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
  list,
  listAll,
  create,
  getRoleIdByName,
  existsByEmail,
  updatePasswordById,
  update,
  softDelete,
};
