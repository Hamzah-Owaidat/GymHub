const { pool } = require('../config/db');

/**
 * Session model – gym / coach sessions with user, gym, and coach joins.
 */

async function list({
  search,
  gym_id,
  gym_ids,
  coach_id,
  user_id,
  status,
  page = 1,
  limit = 20,
  sortBy = 'created_at',
  sortDir = 'desc',
} = {}) {
  const allowedSort = new Set(['id', 'session_date', 'created_at', 'price']);
  const sortColumn = allowedSort.has(sortBy) ? sortBy : 'created_at';
  const direction = sortDir && sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const where = ['s.deleted_at IS NULL'];
  const params = [];

  if (search) {
    const like = `%${search}%`;
    where.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR g.name LIKE ?)');
    params.push(like, like, like, like);
  }
  if (Array.isArray(gym_ids) && gym_ids.length) {
    where.push(`s.gym_id IN (${gym_ids.map(() => '?').join(',')})`);
    params.push(...gym_ids);
  } else if (gym_id) {
    where.push('s.gym_id = ?');
    params.push(gym_id);
  }
  if (coach_id) {
    where.push('s.coach_id = ?');
    params.push(coach_id);
  }
  if (user_id) {
    where.push('s.user_id = ?');
    params.push(user_id);
  }
  if (status) {
    where.push('s.status = ?');
    params.push(status);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM sessions s
    JOIN users u ON u.id = s.user_id AND u.deleted_at IS NULL
    JOIN gyms g ON g.id = s.gym_id AND g.deleted_at IS NULL
    LEFT JOIN coaches c ON c.id = s.coach_id
    ${whereSql}
  `;
  const [countRows] = await pool.query(countSql, params);
  const total = countRows[0] ? countRows[0].total : 0;

  const listSql = `
    SELECT
      s.id,
      s.user_id,
      s.gym_id,
      s.coach_id,
      DATE_FORMAT(s.session_date, '%Y-%m-%d') AS session_date,
      s.start_time,
      s.end_time,
      s.price,
      s.status,
      s.is_private,
      s.created_at,
      s.updated_at,
      u.first_name AS user_first_name,
      u.last_name AS user_last_name,
      u.email AS user_email,
      g.name AS gym_name,
      cu.first_name AS coach_first_name,
      cu.last_name AS coach_last_name
    FROM sessions s
    JOIN users u ON u.id = s.user_id AND u.deleted_at IS NULL
    JOIN gyms g ON g.id = s.gym_id AND g.deleted_at IS NULL
    LEFT JOIN coaches c ON c.id = s.coach_id
    LEFT JOIN users cu ON cu.id = c.user_id
    ${whereSql}
    ORDER BY s.${sortColumn} ${direction}
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
        s.id, s.user_id, s.gym_id, s.coach_id,
        DATE_FORMAT(s.session_date, '%Y-%m-%d') AS session_date, s.start_time, s.end_time,
        s.price, s.status, s.is_private, s.created_at, s.updated_at,
        u.first_name AS user_first_name, u.last_name AS user_last_name, u.email AS user_email,
        g.name AS gym_name,
        cu.first_name AS coach_first_name, cu.last_name AS coach_last_name
      FROM sessions s
      JOIN users u ON u.id = s.user_id AND u.deleted_at IS NULL
      JOIN gyms g ON g.id = s.gym_id AND g.deleted_at IS NULL
      LEFT JOIN coaches c ON c.id = s.coach_id
      LEFT JOIN users cu ON cu.id = c.user_id
      WHERE s.id = ? AND s.deleted_at IS NULL
      LIMIT 1
    `,
    [id],
  );
  return rows[0] || null;
}

async function create({ user_id, gym_id, coach_id = null, session_date, start_time, end_time, price = null, status = 'booked', is_private = true }) {
  const [result] = await pool.query(
    `INSERT INTO sessions (user_id, gym_id, coach_id, session_date, start_time, end_time, price, status, is_private)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [user_id, gym_id, coach_id, session_date, start_time, end_time, price, status, is_private ? 1 : 0],
  );
  return result.insertId;
}

async function update(id, { user_id, gym_id, coach_id, session_date, start_time, end_time, price, status, is_private }) {
  const fields = [];
  const params = [];

  if (user_id !== undefined) { fields.push('user_id = ?'); params.push(user_id); }
  if (gym_id !== undefined) { fields.push('gym_id = ?'); params.push(gym_id); }
  if (coach_id !== undefined) { fields.push('coach_id = ?'); params.push(coach_id); }
  if (session_date !== undefined) { fields.push('session_date = ?'); params.push(session_date); }
  if (start_time !== undefined) { fields.push('start_time = ?'); params.push(start_time); }
  if (end_time !== undefined) { fields.push('end_time = ?'); params.push(end_time); }
  if (price !== undefined) { fields.push('price = ?'); params.push(price); }
  if (status !== undefined) { fields.push('status = ?'); params.push(status); }
  if (is_private !== undefined) { fields.push('is_private = ?'); params.push(is_private ? 1 : 0); }

  if (!fields.length) return false;

  params.push(id);
  const [result] = await pool.query(
    `UPDATE sessions SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
    params,
  );
  return result.affectedRows > 0;
}

async function hasOverlappingPrivateSession(coachId, sessionDate, startTime, endTime, excludeId = null) {
  if (!coachId || !sessionDate || !startTime || !endTime) return false;

  const params = [coachId, sessionDate, endTime, startTime];
  let extraWhere = '';
  if (excludeId) {
    extraWhere = 'AND s.id <> ?';
    params.push(excludeId);
  }

  const [rows] = await pool.query(
    `
      SELECT s.id
      FROM sessions s
      WHERE s.deleted_at IS NULL
        AND s.coach_id = ?
        AND s.session_date = ?
        AND s.is_private = 1
        AND NOT (s.end_time <= ? OR s.start_time >= ?)
        ${extraWhere}
      LIMIT 1
    `,
    params,
  );

  return rows.length > 0;
}

async function hasOverlappingCoachSession(coachId, sessionDate, startTime, endTime, excludeId = null) {
  if (!coachId || !sessionDate || !startTime || !endTime) return false;

  const params = [coachId, sessionDate, endTime, startTime];
  let extraWhere = '';
  if (excludeId) {
    extraWhere = 'AND s.id <> ?';
    params.push(excludeId);
  }

  const [rows] = await pool.query(
    `
      SELECT s.id
      FROM sessions s
      WHERE s.deleted_at IS NULL
        AND s.coach_id = ?
        AND s.session_date = ?
        AND s.status <> 'cancelled'
        AND NOT (s.end_time <= ? OR s.start_time >= ?)
        ${extraWhere}
      LIMIT 1
    `,
    params,
  );
  return rows.length > 0;
}

async function listCoachSessionsForDate(coachId, sessionDate) {
  if (!coachId || !sessionDate) return [];
  const [rows] = await pool.query(
    `
      SELECT id, start_time, end_time, status, is_private
      FROM sessions
      WHERE coach_id = ?
        AND session_date = ?
        AND deleted_at IS NULL
        AND status <> 'cancelled'
      ORDER BY start_time ASC
    `,
    [coachId, sessionDate],
  );
  return rows;
}

async function userExists(userId) {
  const [rows] = await pool.query(
    `
      SELECT id
      FROM users
      WHERE id = ?
        AND deleted_at IS NULL
        AND is_active = 1
      LIMIT 1
    `,
    [userId],
  );
  return rows.length > 0;
}

async function gymExists(gymId) {
  const [rows] = await pool.query(
    `
      SELECT id
      FROM gyms
      WHERE id = ?
        AND deleted_at IS NULL
        AND is_active = 1
      LIMIT 1
    `,
    [gymId],
  );
  return rows.length > 0;
}

async function coachBelongsToGym(coachId, gymId) {
  if (!coachId || !gymId) return false;
  const [rows] = await pool.query(
    `
      SELECT id
      FROM coaches
      WHERE id = ?
        AND gym_id = ?
        AND deleted_at IS NULL
        AND is_active = 1
      LIMIT 1
    `,
    [coachId, gymId],
  );
  return rows.length > 0;
}

async function softDelete(id) {
  const [result] = await pool.query(
    'UPDATE sessions SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
    [id],
  );
  return result.affectedRows > 0;
}

module.exports = {
  list,
  findById,
  create,
  update,
  softDelete,
  hasOverlappingPrivateSession,
  hasOverlappingCoachSession,
  listCoachSessionsForDate,
  userExists,
  gymExists,
  coachBelongsToGym,
};
