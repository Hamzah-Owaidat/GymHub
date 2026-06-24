const { pool } = require('../config/db');
const { generateToken } = require('../utils/entryQr');

async function listByUser(user_id) {
  const [rows] = await pool.query(
    `
      SELECT
        us.id,
        us.user_id,
        us.gym_id,
        us.plan_id,
        us.start_date,
        us.end_date,
        us.status,
        us.created_at,
        us.updated_at,
        g.name AS gym_name,
        p.name AS plan_name,
        p.price AS plan_price,
        p.duration_days
      FROM user_subscriptions us
      JOIN gyms g ON g.id = us.gym_id AND g.deleted_at IS NULL
      JOIN subscription_plans p ON p.id = us.plan_id AND p.deleted_at IS NULL
      WHERE us.user_id = ? AND us.deleted_at IS NULL
      ORDER BY us.created_at DESC
    `,
    [user_id],
  );
  return rows;
}

async function create({ user_id, gym_id, plan_id, start_date, end_date, status = 'active', qr_token }) {
  const token = qr_token || generateToken();
  const [result] = await pool.query(
    `
      INSERT INTO user_subscriptions (user_id, gym_id, plan_id, start_date, end_date, status, qr_token)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [user_id, gym_id, plan_id, start_date, end_date, status, token],
  );
  return { id: result.insertId, qr_token: token };
}

async function activeForGym(userId, gymId) {
  const [rows] = await pool.query(
    `
      SELECT id, plan_id, start_date, end_date, status, qr_token
      FROM user_subscriptions
      WHERE user_id = ? AND gym_id = ? AND status = 'active'
        AND end_date >= CURDATE()
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [userId, gymId],
  );
  return rows[0] || null;
}

async function listActiveSubscribersByGym(gymId) {
  const [rows] = await pool.query(
    `
      SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, us.gym_id
      FROM users u
      JOIN user_subscriptions us ON us.user_id = u.id
      WHERE us.gym_id = ?
        AND us.status = 'active'
        AND (us.start_date IS NULL OR us.start_date <= CURDATE())
        AND (us.end_date IS NULL OR DATE(us.end_date) >= CURDATE())
        AND us.deleted_at IS NULL
        AND u.deleted_at IS NULL
        AND u.is_active = 1
      ORDER BY u.first_name, u.last_name
    `,
    [gymId],
  );
  return rows;
}

async function listActiveSubscribersByGymIds(gymIds) {
  if (!Array.isArray(gymIds) || !gymIds.length) return [];
  const placeholders = gymIds.map(() => '?').join(', ');
  const [rows] = await pool.query(
    `
      SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, us.gym_id
      FROM users u
      JOIN user_subscriptions us ON us.user_id = u.id
      WHERE us.gym_id IN (${placeholders})
        AND us.status = 'active'
        AND (us.start_date IS NULL OR us.start_date <= CURDATE())
        AND (us.end_date IS NULL OR DATE(us.end_date) >= CURDATE())
        AND us.deleted_at IS NULL
        AND u.deleted_at IS NULL
        AND u.is_active = 1
      ORDER BY us.gym_id, u.first_name, u.last_name
    `,
    gymIds,
  );
  return rows;
}

async function listByGymAndUser(gymId, userId) {
  const [rows] = await pool.query(
    `
      SELECT
        us.id,
        us.user_id,
        us.gym_id,
        us.plan_id,
        DATE_FORMAT(us.start_date, '%Y-%m-%d') AS start_date,
        DATE_FORMAT(us.end_date, '%Y-%m-%d') AS end_date,
        us.status,
        p.name AS plan_name,
        p.price AS plan_price
      FROM user_subscriptions us
      JOIN subscription_plans p ON p.id = us.plan_id AND p.deleted_at IS NULL
      WHERE us.gym_id = ? AND us.user_id = ? AND us.deleted_at IS NULL
      ORDER BY us.created_at DESC
    `,
    [gymId, userId],
  );
  return rows;
}

async function findByIdForUser(id, userId) {
  const [rows] = await pool.query(
    `
      SELECT
        us.id,
        us.user_id,
        us.gym_id,
        us.plan_id,
        us.start_date,
        us.end_date,
        us.status,
        us.qr_token,
        g.name AS gym_name,
        p.name AS plan_name
      FROM user_subscriptions us
      JOIN gyms g ON g.id = us.gym_id AND g.deleted_at IS NULL
      JOIN subscription_plans p ON p.id = us.plan_id AND p.deleted_at IS NULL
      WHERE us.id = ? AND us.user_id = ? AND us.deleted_at IS NULL
      LIMIT 1
    `,
    [id, userId],
  );
  return rows[0] || null;
}

async function findByQrToken(qr_token) {
  const [rows] = await pool.query(
    `
      SELECT
        us.id,
        us.user_id,
        us.gym_id,
        us.plan_id,
        us.start_date,
        us.end_date,
        us.status,
        us.qr_token,
        g.name AS gym_name,
        u.first_name AS user_first_name,
        u.last_name AS user_last_name,
        u.email AS user_email,
        p.name AS plan_name
      FROM user_subscriptions us
      JOIN gyms g ON g.id = us.gym_id AND g.deleted_at IS NULL
      JOIN users u ON u.id = us.user_id AND u.deleted_at IS NULL
      JOIN subscription_plans p ON p.id = us.plan_id AND p.deleted_at IS NULL
      WHERE us.qr_token = ? AND us.deleted_at IS NULL
      LIMIT 1
    `,
    [qr_token],
  );
  return rows[0] || null;
}

async function ensureQrToken(id) {
  const [rows] = await pool.query(
    'SELECT qr_token FROM user_subscriptions WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id],
  );
  if (!rows[0]) return null;
  if (rows[0].qr_token) return rows[0].qr_token;

  const token = generateToken();
  await pool.query(
    'UPDATE user_subscriptions SET qr_token = ? WHERE id = ? AND deleted_at IS NULL',
    [token, id],
  );
  return token;
}

function isEntryAllowed(sub) {
  if (!sub) return { allowed: false, reason: 'Subscription not found' };
  if (sub.status !== 'active') return { allowed: false, reason: 'Subscription is not active' };
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const end = sub.end_date instanceof Date
    ? sub.end_date.toISOString().slice(0, 10)
    : String(sub.end_date).slice(0, 10);
  if (end < todayStr) return { allowed: false, reason: 'Subscription has expired' };
  return { allowed: true, reason: null };
}

module.exports = {
  listByUser,
  create,
  activeForGym,
  listActiveSubscribersByGym,
  listActiveSubscribersByGymIds,
  listByGymAndUser,
  findByIdForUser,
  findByQrToken,
  ensureQrToken,
  isEntryAllowed,
};
