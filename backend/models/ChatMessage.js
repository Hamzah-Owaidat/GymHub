const { pool } = require('../config/db');

async function findSessionParticipants(sessionId) {
  const [rows] = await pool.query(
    `
      SELECT
        s.id AS session_id,
        s.user_id AS member_user_id,
        s.status AS session_status,
        c.user_id AS coach_user_id,
        u.first_name AS member_first_name,
        u.last_name AS member_last_name,
        cu.first_name AS coach_first_name,
        cu.last_name AS coach_last_name
      FROM sessions s
      LEFT JOIN coaches c ON c.id = s.coach_id AND c.deleted_at IS NULL
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN users cu ON cu.id = c.user_id
      WHERE s.id = ? AND s.deleted_at IS NULL
      LIMIT 1
    `,
    [sessionId],
  );
  return rows[0] || null;
}

async function listConversationsForUser(userId) {
  const [rows] = await pool.query(
    `
      SELECT
        s.id AS session_id,
        DATE_FORMAT(s.session_date, '%Y-%m-%d') AS session_date,
        s.start_time,
        s.end_time,
        s.status AS session_status,
        s.user_id AS member_user_id,
        c.user_id AS coach_user_id,
        u.first_name AS member_first_name,
        u.last_name AS member_last_name,
        cu.first_name AS coach_first_name,
        cu.last_name AS coach_last_name,
        lastMsg.id AS last_message_id,
        lastMsg.message AS last_message,
        lastMsg.sender_user_id AS last_message_sender_user_id,
        lastMsg.created_at AS last_message_at,
        COALESCE(unread.unread_count, 0) AS unread_count
      FROM sessions s
      LEFT JOIN coaches c ON c.id = s.coach_id AND c.deleted_at IS NULL
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN users cu ON cu.id = c.user_id
      LEFT JOIN (
        SELECT cm1.*
        FROM chat_messages cm1
        INNER JOIN (
          SELECT session_id, MAX(id) AS max_id
          FROM chat_messages
          WHERE deleted_at IS NULL
          GROUP BY session_id
        ) latest ON latest.session_id = cm1.session_id AND latest.max_id = cm1.id
      ) lastMsg ON lastMsg.session_id = s.id
      LEFT JOIN (
        SELECT session_id, COUNT(*) AS unread_count
        FROM chat_messages
        WHERE deleted_at IS NULL
          AND is_read = 0
          AND sender_user_id <> ?
        GROUP BY session_id
      ) unread ON unread.session_id = s.id
      WHERE s.deleted_at IS NULL
        AND s.coach_id IS NOT NULL
        AND s.status <> 'cancelled'
        AND (s.user_id = ? OR c.user_id = ?)
      ORDER BY COALESCE(lastMsg.created_at, s.created_at) DESC, s.id DESC
    `,
    [userId, userId, userId],
  );
  return rows;
}

async function listMessagesBySession(sessionId, limit = 100) {
  const safeLimit = Math.min(Number(limit) || 100, 200);
  const [rows] = await pool.query(
    `
      SELECT id, session_id, sender_user_id, message_type, message, attachment_url, attachment_name, attachment_mime, is_read, created_at
      FROM chat_messages
      WHERE session_id = ? AND deleted_at IS NULL
      ORDER BY id ASC
      LIMIT ?
    `,
    [sessionId, safeLimit],
  );
  return rows;
}

async function createMessage({
  session_id,
  sender_user_id,
  message,
  message_type = 'text',
  attachment_url = null,
  attachment_name = null,
  attachment_mime = null,
}) {
  const [result] = await pool.query(
    `
      INSERT INTO chat_messages (session_id, sender_user_id, message_type, message, attachment_url, attachment_name, attachment_mime)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [session_id, sender_user_id, message_type, message || '', attachment_url, attachment_name, attachment_mime],
  );
  return result.insertId;
}

async function findById(id) {
  const [rows] = await pool.query(
    `
      SELECT id, session_id, sender_user_id, message_type, message, attachment_url, attachment_name, attachment_mime, is_read, created_at
      FROM chat_messages
      WHERE id = ? AND deleted_at IS NULL
      LIMIT 1
    `,
    [id],
  );
  return rows[0] || null;
}

async function markSessionMessagesReadByReceiver(sessionId, receiverUserId) {
  const [result] = await pool.query(
    `
      UPDATE chat_messages
      SET is_read = 1
      WHERE session_id = ?
        AND deleted_at IS NULL
        AND is_read = 0
        AND sender_user_id <> ?
    `,
    [sessionId, receiverUserId],
  );
  return result.affectedRows || 0;
}

module.exports = {
  findSessionParticipants,
  listConversationsForUser,
  listMessagesBySession,
  createMessage,
  findById,
  markSessionMessagesReadByReceiver,
};
