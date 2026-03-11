const { pool } = require('../config/db');

/**
 * Coach model – joins users and gyms for dashboard listing.
 */

async function list({
  search,
  gym_id,
  gym_ids,
  is_active,
  page = 1,
  limit = 20,
  sortBy = 'created_at',
  sortDir = 'desc',
} = {}) {
  const allowedSort = new Set(['id', 'created_at']);
  const sortColumn = allowedSort.has(sortBy) ? sortBy : 'created_at';
  const direction = sortDir && sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const where = ['c.deleted_at IS NULL'];
  const params = [];

  if (search) {
    const like = `%${search}%`;
    where.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)');
    params.push(like, like, like);
  }
  if (Array.isArray(gym_ids) && gym_ids.length) {
    where.push(`c.gym_id IN (${gym_ids.map(() => '?').join(',')})`);
    params.push(...gym_ids);
  } else if (gym_id) {
    where.push('c.gym_id = ?');
    params.push(gym_id);
  }
  if (typeof is_active === 'boolean') {
    where.push('c.is_active = ?');
    params.push(is_active ? 1 : 0);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM coaches c
    JOIN users u ON u.id = c.user_id AND u.deleted_at IS NULL
    JOIN gyms g ON g.id = c.gym_id AND g.deleted_at IS NULL
    ${whereSql}
  `;
  const [countRows] = await pool.query(countSql, params);
  const total = countRows[0] ? countRows[0].total : 0;

  const listSql = `
    SELECT
      c.id,
      c.user_id,
      c.gym_id,
      c.specialization,
      c.bio,
      c.price_per_session,
      c.is_active,
      c.created_at,
      c.updated_at,
      u.first_name AS user_first_name,
      u.last_name AS user_last_name,
      u.email AS user_email,
      g.name AS gym_name
    FROM coaches c
    JOIN users u ON u.id = c.user_id AND u.deleted_at IS NULL
    JOIN gyms g ON g.id = c.gym_id AND g.deleted_at IS NULL
    ${whereSql}
    ORDER BY c.${sortColumn} ${direction}
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
        c.id,
        c.user_id,
        c.gym_id,
        c.specialization,
        c.bio,
        c.price_per_session,
        c.is_active,
        c.created_at,
        c.updated_at,
        u.first_name AS user_first_name,
        u.last_name AS user_last_name,
        u.email AS user_email,
        g.name AS gym_name
      FROM coaches c
      JOIN users u ON u.id = c.user_id AND u.deleted_at IS NULL
      JOIN gyms g ON g.id = c.gym_id AND g.deleted_at IS NULL
      WHERE c.id = ? AND c.deleted_at IS NULL
      LIMIT 1
    `,
    [id],
  );
  return rows[0] || null;
}

async function create({
  user_id,
  gym_id,
  specialization = null,
  bio = null,
  price_per_session = null,
  is_active = true,
}) {
  const [result] = await pool.query(
    `
      INSERT INTO coaches (user_id, gym_id, specialization, bio, price_per_session, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [user_id, gym_id, specialization, bio, price_per_session, is_active ? 1 : 0],
  );
  return result.insertId;
}

async function update(
  id,
  { user_id, gym_id, specialization, bio, price_per_session, is_active },
) {
  const fields = [];
  const params = [];

  if (user_id !== undefined) {
    fields.push('user_id = ?');
    params.push(user_id);
  }
  if (gym_id !== undefined) {
    fields.push('gym_id = ?');
    params.push(gym_id);
  }
  if (specialization !== undefined) {
    fields.push('specialization = ?');
    params.push(specialization);
  }
  if (bio !== undefined) {
    fields.push('bio = ?');
    params.push(bio);
  }
  if (price_per_session !== undefined) {
    fields.push('price_per_session = ?');
    params.push(price_per_session);
  }
  if (is_active !== undefined) {
    fields.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }

  if (!fields.length) return false;

  params.push(id);

  const [result] = await pool.query(
    `
      UPDATE coaches
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = ? AND deleted_at IS NULL
    `,
    params,
  );
  return result.affectedRows > 0;
}

async function softDelete(id) {
  const [result] = await pool.query(
    `
      UPDATE coaches
      SET deleted_at = NOW(), is_active = FALSE
      WHERE id = ? AND deleted_at IS NULL
    `,
    [id],
  );
  return result.affectedRows > 0;
}

async function getAvailability(coachId) {
  const [rows] = await pool.query(
    `SELECT id, coach_id, day, start_time, end_time, is_private
     FROM coach_availability
     WHERE coach_id = ? AND deleted_at IS NULL
     ORDER BY FIELD(day, 'monday','tuesday','wednesday','thursday','friday','saturday','sunday'), start_time`,
    [coachId],
  );
  return rows;
}

async function replaceAvailability(coachId, slots) {
  const existing = await getAvailability(coachId);
  const normalizedSlots = (Array.isArray(slots) ? slots : []);

  const normalize = (arr) =>
    arr
      .map((s) => `${s.day}|${(s.start_time || '').toString().slice(0, 5)}|${(s.end_time || '').toString().slice(0, 5)}`)
      .sort()
      .join(',');

  if (normalize(existing) === normalize(normalizedSlots)) return;

  await pool.query(
    'UPDATE coach_availability SET deleted_at = NOW() WHERE coach_id = ? AND deleted_at IS NULL',
    [coachId],
  );

  if (!normalizedSlots.length) return;

  const values = normalizedSlots.map(() => '(?, ?, ?, ?, ?)').join(', ');
  const params = [];
  normalizedSlots.forEach((s) => {
    params.push(coachId, s.day, s.start_time || null, s.end_time || null, s.is_private ? 1 : 0);
  });

  await pool.query(
    `INSERT INTO coach_availability (coach_id, day, start_time, end_time, is_private) VALUES ${values}`,
    params,
  );
}

async function deleteAvailability(coachId) {
  await pool.query(
    'UPDATE coach_availability SET deleted_at = NOW() WHERE coach_id = ? AND deleted_at IS NULL',
    [coachId],
  );
}

module.exports = {
  list,
  findById,
  create,
  update,
  softDelete,
  getAvailability,
  replaceAvailability,
  deleteAvailability,
};

