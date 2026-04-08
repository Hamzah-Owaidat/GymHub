const { pool } = require('../config/db');

const MAX_CARDS_PER_USER = 2;

async function listByUser(userId) {
  const [rows] = await pool.query(
    `SELECT id, user_id, card_label, card_holder, card_last4, card_brand, card_expiry, is_default, created_at
     FROM user_cards
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY is_default DESC, created_at DESC`,
    [userId],
  );
  return rows;
}

async function findById(id, userId) {
  const [rows] = await pool.query(
    `SELECT id, user_id, card_label, card_holder, card_last4, card_brand, card_expiry, is_default, created_at
     FROM user_cards
     WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    [id, userId],
  );
  return rows[0] || null;
}

async function countByUser(userId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS total FROM user_cards WHERE user_id = ? AND deleted_at IS NULL',
    [userId],
  );
  return Number(rows[0].total);
}

async function create({ user_id, card_label, card_holder, card_last4, card_brand, card_expiry, is_default }) {
  if (is_default) {
    await pool.query(
      'UPDATE user_cards SET is_default = 0 WHERE user_id = ? AND deleted_at IS NULL',
      [user_id],
    );
  }
  const [result] = await pool.query(
    `INSERT INTO user_cards (user_id, card_label, card_holder, card_last4, card_brand, card_expiry, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user_id, card_label || 'My Card', card_holder, card_last4, card_brand || 'visa', card_expiry, is_default ? 1 : 0],
  );
  return result.insertId;
}

async function setDefault(id, userId) {
  await pool.query(
    'UPDATE user_cards SET is_default = 0 WHERE user_id = ? AND deleted_at IS NULL',
    [userId],
  );
  await pool.query(
    'UPDATE user_cards SET is_default = 1 WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
    [id, userId],
  );
}

async function remove(id, userId) {
  await pool.query(
    'UPDATE user_cards SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
    [id, userId],
  );
}

module.exports = { MAX_CARDS_PER_USER, listByUser, findById, countByUser, create, setDefault, remove };
