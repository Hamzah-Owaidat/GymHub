const { pool } = require('../config/db');

async function invalidateActiveByUser(userId) {
  await pool.query(
    `UPDATE password_reset_otps
     SET consumed_at = NOW()
     WHERE user_id = ? AND consumed_at IS NULL AND expires_at >= NOW()`,
    [userId],
  );
}

async function create({ user_id, email, otp_code, expires_in_minutes }) {
  const [result] = await pool.query(
    `INSERT INTO password_reset_otps (user_id, email, otp_code, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [
      user_id,
      String(email || '').trim().toLowerCase(),
      otp_code,
      Number(expires_in_minutes) || 5,
    ],
  );
  return result.insertId;
}

async function findLatestActiveByEmail(email) {
  const [rows] = await pool.query(
    `SELECT id, user_id, email, otp_code, expires_at, consumed_at, created_at
     FROM password_reset_otps
     WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) AND consumed_at IS NULL
     ORDER BY id DESC
     LIMIT 1`,
    [email],
  );
  return rows[0] || null;
}

async function findValidByEmailAndCode(email, otpCode) {
  const [rows] = await pool.query(
    `SELECT id, user_id, email, otp_code, expires_at, consumed_at, created_at
     FROM password_reset_otps
     WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
       AND otp_code = ?
       AND consumed_at IS NULL
       AND expires_at >= NOW()
     ORDER BY id DESC
     LIMIT 1`,
    [email, otpCode],
  );
  return rows[0] || null;
}

async function findLatestByEmailAndCode(email, otpCode) {
  const [rows] = await pool.query(
    `SELECT id, user_id, email, otp_code, expires_at, consumed_at, created_at
     FROM password_reset_otps
     WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
       AND otp_code = ?
       AND consumed_at IS NULL
     ORDER BY id DESC
     LIMIT 1`,
    [email, otpCode],
  );
  return rows[0] || null;
}

async function consume(id) {
  await pool.query(
    `UPDATE password_reset_otps
     SET consumed_at = NOW()
     WHERE id = ?`,
    [id],
  );
}

module.exports = {
  invalidateActiveByUser,
  create,
  findLatestActiveByEmail,
  findValidByEmailAndCode,
  findLatestByEmailAndCode,
  consume,
};
