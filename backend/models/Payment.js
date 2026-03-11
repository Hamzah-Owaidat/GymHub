const { pool } = require('../config/db');

/**
 * Payment model – tracks payments linked to users, gyms, subscriptions, and sessions.
 */

async function list({
  search,
  gym_id,
  user_id,
  status,
  method,
  page = 1,
  limit = 20,
  sortBy = 'created_at',
  sortDir = 'desc',
} = {}) {
  const allowedSort = new Set(['id', 'amount', 'created_at']);
  const sortColumn = allowedSort.has(sortBy) ? sortBy : 'created_at';
  const direction = sortDir && sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const where = ['p.deleted_at IS NULL'];
  const params = [];

  if (search) {
    const like = `%${search}%`;
    where.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR g.name LIKE ? OR p.method LIKE ?)');
    params.push(like, like, like, like, like);
  }
  if (gym_id) {
    where.push('p.gym_id = ?');
    params.push(gym_id);
  }
  if (user_id) {
    where.push('p.user_id = ?');
    params.push(user_id);
  }
  if (status) {
    where.push('p.status = ?');
    params.push(status);
  }
  if (method) {
    where.push('p.method = ?');
    params.push(method);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM payments p
    JOIN users u ON u.id = p.user_id AND u.deleted_at IS NULL
    JOIN gyms g ON g.id = p.gym_id AND g.deleted_at IS NULL
    ${whereSql}
  `;
  const [countRows] = await pool.query(countSql, params);
  const total = countRows[0] ? countRows[0].total : 0;

  const listSql = `
    SELECT
      p.id,
      p.user_id,
      p.gym_id,
      p.subscription_id,
      p.session_id,
      p.amount,
      p.method,
      p.status,
      p.created_at,
      u.first_name AS user_first_name,
      u.last_name AS user_last_name,
      u.email AS user_email,
      g.name AS gym_name
    FROM payments p
    JOIN users u ON u.id = p.user_id AND u.deleted_at IS NULL
    JOIN gyms g ON g.id = p.gym_id AND g.deleted_at IS NULL
    ${whereSql}
    ORDER BY p.${sortColumn} ${direction}
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(listSql, [...params, Number(limit), offset]);

  return {
    data: rows,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)) || 0,
    },
  };
}

async function findById(id) {
  const [rows] = await pool.query(
    `
      SELECT
        p.id, p.user_id, p.gym_id, p.subscription_id, p.session_id,
        p.amount, p.method, p.status, p.created_at,
        u.first_name AS user_first_name, u.last_name AS user_last_name, u.email AS user_email,
        g.name AS gym_name
      FROM payments p
      JOIN users u ON u.id = p.user_id AND u.deleted_at IS NULL
      JOIN gyms g ON g.id = p.gym_id AND g.deleted_at IS NULL
      WHERE p.id = ? AND p.deleted_at IS NULL
      LIMIT 1
    `,
    [id],
  );
  return rows[0] || null;
}

async function create({ user_id, gym_id, subscription_id = null, session_id = null, amount, method = null, status = 'pending' }) {
  const [result] = await pool.query(
    `INSERT INTO payments (user_id, gym_id, subscription_id, session_id, amount, method, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user_id, gym_id, subscription_id, session_id, amount, method, status],
  );
  return result.insertId;
}

async function update(id, { user_id, gym_id, subscription_id, session_id, amount, method, status }) {
  const fields = [];
  const params = [];

  if (user_id !== undefined) { fields.push('user_id = ?'); params.push(user_id); }
  if (gym_id !== undefined) { fields.push('gym_id = ?'); params.push(gym_id); }
  if (subscription_id !== undefined) { fields.push('subscription_id = ?'); params.push(subscription_id); }
  if (session_id !== undefined) { fields.push('session_id = ?'); params.push(session_id); }
  if (amount !== undefined) { fields.push('amount = ?'); params.push(amount); }
  if (method !== undefined) { fields.push('method = ?'); params.push(method); }
  if (status !== undefined) { fields.push('status = ?'); params.push(status); }

  if (!fields.length) return false;

  params.push(id);
  const [result] = await pool.query(
    `UPDATE payments SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
    params,
  );
  return result.affectedRows > 0;
}

async function softDelete(id) {
  const [result] = await pool.query(
    'UPDATE payments SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
    [id],
  );
  return result.affectedRows > 0;
}

module.exports = { list, findById, create, update, softDelete };
