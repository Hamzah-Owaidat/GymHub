const { pool } = require('../config/db');

/**
 * Notification model.
 * Backed by the `notifications` table created in 010_create_notifications.sql.
 */

async function listForUser(userId, { page = 1, limit = 20 } = {}) {
  const safeLimit = Math.min(Number(limit) || 20, 50);
  const offset = (Number(page) - 1) * safeLimit;

  const [countRows] = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM notifications
      WHERE user_id = ? AND deleted_at IS NULL
    `,
    [userId],
  );
  const total = countRows[0] ? countRows[0].total : 0;

  const [rows] = await pool.query(
    `
      SELECT id, user_id, title, message, type, is_read, created_at
      FROM notifications
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `,
    [userId, safeLimit, offset],
  );

  return {
    data: rows,
    pagination: {
      total,
      page: Number(page),
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit) || 0,
    },
  };
}

async function countUnread(userId) {
  const [rows] = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM notifications
      WHERE user_id = ? AND deleted_at IS NULL AND is_read = FALSE
    `,
    [userId],
  );
  return rows[0] ? rows[0].total : 0;
}

async function markAsRead(userId, notificationId) {
  const [result] = await pool.query(
    `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `,
    [notificationId, userId],
  );
  return result.affectedRows > 0;
}

async function markAllAsRead(userId) {
  const [result] = await pool.query(
    `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = ? AND deleted_at IS NULL AND is_read = FALSE
    `,
    [userId],
  );
  return result.affectedRows;
}

async function createForUser(userId, { title, message, type }) {
  const [result] = await pool.query(
    `
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `,
    [userId, title || null, message || null, type],
  );
  return result.insertId;
}

async function createForAllUsers({ title, message, type }) {
  // Fetch all active users once, then bulk insert.
  const [userRows] = await pool.query(
    `
      SELECT id
      FROM users
      WHERE deleted_at IS NULL
    `,
  );

  if (!userRows.length) return 0;

  const values = userRows.map(() => '(?, ?, ?, ?)').join(', ');
  const params = [];
  userRows.forEach((u) => {
    params.push(u.id, title || null, message || null, type);
  });

  const [result] = await pool.query(
    `
      INSERT INTO notifications (user_id, title, message, type)
      VALUES ${values}
    `,
    params,
  );

  return result.affectedRows || 0;
}

module.exports = {
  listForUser,
  countUnread,
  markAsRead,
  markAllAsRead,
  createForUser,
  createForAllUsers,
};

