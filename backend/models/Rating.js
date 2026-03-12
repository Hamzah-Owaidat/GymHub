const { pool } = require('../config/db');

async function findByUserAndGym(userId, gymId) {
  const [rows] = await pool.query(
    `SELECT id, user_id, gym_id, rating, comment, created_at
     FROM ratings
     WHERE user_id = ? AND gym_id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [userId, gymId],
  );
  return rows[0] || null;
}

async function upsert({ user_id, gym_id, rating, comment = null }) {
  const existing = await findByUserAndGym(user_id, gym_id);

  if (existing) {
    await pool.query(
      `UPDATE ratings SET rating = ?, comment = ?, deleted_at = NULL WHERE id = ?`,
      [rating, comment, existing.id],
    );
  } else {
    await pool.query(
      `INSERT INTO ratings (user_id, gym_id, rating, comment) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), deleted_at = NULL`,
      [user_id, gym_id, rating, comment],
    );
  }

  await recalcGymRating(gym_id);
}

async function listByGym(gymId, { page = 1, limit = 20 } = {}) {
  const offset = (Number(page) - 1) * Number(limit);

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM ratings WHERE gym_id = ? AND deleted_at IS NULL`,
    [gymId],
  );
  const total = countRows[0] ? Number(countRows[0].total) : 0;

  const [rows] = await pool.query(
    `SELECT r.id, r.user_id, r.gym_id, r.rating, r.comment, r.created_at,
            u.first_name, u.last_name
     FROM ratings r
     JOIN users u ON u.id = r.user_id AND u.deleted_at IS NULL
     WHERE r.gym_id = ? AND r.deleted_at IS NULL
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [gymId, Number(limit), offset],
  );

  return {
    data: rows,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) || 0 },
  };
}

async function recalcGymRating(gymId) {
  const [rows] = await pool.query(
    `SELECT AVG(rating) AS avg_rating, COUNT(*) AS cnt
     FROM ratings
     WHERE gym_id = ? AND deleted_at IS NULL`,
    [gymId],
  );
  const avg = rows[0]?.avg_rating ? Number(Number(rows[0].avg_rating).toFixed(1)) : 0;
  const cnt = rows[0]?.cnt ? Number(rows[0].cnt) : 0;

  await pool.query(
    `UPDATE gyms SET rating_average = ?, rating_count = ? WHERE id = ?`,
    [avg, cnt, gymId],
  );
}

async function remove(userId, gymId) {
  await pool.query(
    `UPDATE ratings SET deleted_at = NOW() WHERE user_id = ? AND gym_id = ? AND deleted_at IS NULL`,
    [userId, gymId],
  );
  await recalcGymRating(gymId);
}

module.exports = { findByUserAndGym, upsert, listByGym, recalcGymRating, remove };
