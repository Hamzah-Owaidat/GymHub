const { pool } = require('../config/db');

async function create({ user_id = null, name = null, email = null, subject = null, message }) {
  const [result] = await pool.query(
    `
      INSERT INTO contact_messages (user_id, name, email, subject, message)
      VALUES (?, ?, ?, ?, ?)
    `,
    [user_id, name, email, subject, message],
  );
  return result.insertId;
}

module.exports = {
  create,
};

