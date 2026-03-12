const { pool } = require('../config/db');

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

async function create({ user_id, gym_id, plan_id, start_date, end_date, status = 'active' }) {
  const [result] = await pool.query(
    `
      INSERT INTO user_subscriptions (user_id, gym_id, plan_id, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [user_id, gym_id, plan_id, start_date, end_date, status],
  );
  return result.insertId;
}

async function activeForGym(userId, gymId) {
  const [rows] = await pool.query(
    `
      SELECT id, plan_id, start_date, end_date, status
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

module.exports = {
  listByUser,
  create,
  activeForGym,
};

