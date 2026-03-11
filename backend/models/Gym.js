const { pool } = require('../config/db');

/**
 * Gym model with helpers for images and coaches.
 */

async function list({
  search,
  owner_id,
  is_active,
  page = 1,
  limit = 20,
  sortBy = 'created_at',
  sortDir = 'desc',
} = {}) {
  const allowedSort = new Set(['id', 'name', 'created_at']);
  const sortColumn = allowedSort.has(sortBy) ? sortBy : 'created_at';
  const direction = sortDir && sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const where = ['g.deleted_at IS NULL'];
  const params = [];

  if (search) {
    const like = `%${search}%`;
    where.push('(g.name LIKE ? OR g.location LIKE ?)');
    params.push(like, like);
  }
  if (owner_id) {
    where.push('g.owner_id = ?');
    params.push(owner_id);
  }
  if (typeof is_active === 'boolean') {
    where.push('g.is_active = ?');
    params.push(is_active ? 1 : 0);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM gyms g
    LEFT JOIN users u ON u.id = g.owner_id
    ${whereSql}
  `;
  const [countRows] = await pool.query(countSql, params);
  const total = countRows[0] ? countRows[0].total : 0;

  const listSql = `
    SELECT
      g.id,
      g.name,
      g.description,
      g.location,
      g.working_hours,
      g.working_days,
      g.phone,
      g.email,
      g.owner_id,
      g.rating_average,
      g.rating_count,
      g.is_active,
      g.created_at,
      g.updated_at,
      u.first_name AS owner_first_name,
      u.last_name AS owner_last_name
    FROM gyms g
    LEFT JOIN users u ON u.id = g.owner_id
    ${whereSql}
    ORDER BY g.${sortColumn} ${direction}
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

async function listAll({
  search,
  owner_id,
  is_active,
  sortBy = 'created_at',
  sortDir = 'desc',
} = {}) {
  const allowedSort = new Set(['id', 'name', 'created_at']);
  const sortColumn = allowedSort.has(sortBy) ? sortBy : 'created_at';
  const direction = sortDir && sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const where = ['g.deleted_at IS NULL'];
  const params = [];

  if (search) {
    const like = `%${search}%`;
    where.push('(g.name LIKE ? OR g.location LIKE ?)');
    params.push(like, like);
  }
  if (owner_id) {
    where.push('g.owner_id = ?');
    params.push(owner_id);
  }
  if (typeof is_active === 'boolean') {
    where.push('g.is_active = ?');
    params.push(is_active ? 1 : 0);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT
      g.id,
      g.name,
      g.description,
      g.location,
      g.working_hours,
      g.working_days,
      g.phone,
      g.email,
      g.owner_id,
      g.rating_average,
      g.rating_count,
      g.is_active,
      g.created_at,
      g.updated_at,
      u.first_name AS owner_first_name,
      u.last_name AS owner_last_name
    FROM gyms g
    LEFT JOIN users u ON u.id = g.owner_id
    ${whereSql}
    ORDER BY g.${sortColumn} ${direction}
  `;

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    `
      SELECT
        g.id,
        g.name,
        g.description,
        g.location,
        g.working_hours,
        g.working_days,
        g.phone,
        g.email,
        g.owner_id,
        g.rating_average,
        g.rating_count,
        g.is_active,
        g.created_at,
        g.updated_at,
        u.first_name AS owner_first_name,
        u.last_name AS owner_last_name
      FROM gyms g
      LEFT JOIN users u ON u.id = g.owner_id
      WHERE g.id = ? AND g.deleted_at IS NULL
      LIMIT 1
    `,
    [id]
  );
  return rows[0] || null;
}

async function create({
  name,
  description = null,
  location = null,
  working_hours = null,
  working_days = null,
  phone = null,
  email = null,
  owner_id,
  is_active = true,
}) {
  const [result] = await pool.query(
    `
      INSERT INTO gyms (name, description, location, working_hours, working_days, phone, email, owner_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [name, description, location, working_hours, working_days, phone, email, owner_id, is_active ? 1 : 0]
  );
  return result.insertId;
}

async function update(id, {
  name,
  description,
  location,
  working_hours,
  working_days,
  phone,
  email,
  owner_id,
  is_active,
}) {
  const fields = [];
  const params = [];

  if (name !== undefined) {
    fields.push('name = ?');
    params.push(name);
  }
  if (description !== undefined) {
    fields.push('description = ?');
    params.push(description);
  }
  if (location !== undefined) {
    fields.push('location = ?');
    params.push(location);
  }
  if (working_hours !== undefined) {
    fields.push('working_hours = ?');
    params.push(working_hours);
  }
  if (working_days !== undefined) {
    fields.push('working_days = ?');
    params.push(working_days);
  }
  if (phone !== undefined) {
    fields.push('phone = ?');
    params.push(phone);
  }
  if (email !== undefined) {
    fields.push('email = ?');
    params.push(email);
  }
  if (owner_id !== undefined) {
    fields.push('owner_id = ?');
    params.push(owner_id);
  }
  if (is_active !== undefined) {
    fields.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }

  if (!fields.length) return false;

  params.push(id);

  const [result] = await pool.query(
    `
      UPDATE gyms
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = ? AND deleted_at IS NULL
    `,
    params
  );
  return result.affectedRows > 0;
}

async function softDelete(id) {
  const [result] = await pool.query(
    `
      UPDATE gyms
      SET deleted_at = NOW(), is_active = FALSE
      WHERE id = ? AND deleted_at IS NULL
    `,
    [id]
  );
  return result.affectedRows > 0;
}

async function getImages(gymId) {
  const [rows] = await pool.query(
    `
      SELECT id, image_url, created_at
      FROM gym_images
      WHERE gym_id = ? AND deleted_at IS NULL
      ORDER BY id ASC
    `,
    [gymId]
  );
  return rows;
}

async function replaceImages(gymId, imageUrls = []) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query('DELETE FROM gym_images WHERE gym_id = ?', [gymId]);

    if (imageUrls.length) {
      const values = imageUrls.map((url) => [gymId, url]);
      await conn.query(
        `
          INSERT INTO gym_images (gym_id, image_url)
          VALUES ?
        `,
        [values]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getCoaches(gymId) {
  const [rows] = await pool.query(
    `
      SELECT
        c.id,
        c.user_id,
        c.specialization,
        c.bio,
        c.price_per_session,
        c.is_active,
        c.created_at,
        u.first_name,
        u.last_name,
        u.email
      FROM coaches c
      JOIN users u ON u.id = c.user_id AND u.deleted_at IS NULL
      WHERE c.gym_id = ? AND c.deleted_at IS NULL
      ORDER BY c.id ASC
    `,
    [gymId]
  );
  return rows;
}

async function replaceCoaches(gymId, userIds = []) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query('UPDATE coaches SET deleted_at = NOW(), is_active = FALSE WHERE gym_id = ? AND deleted_at IS NULL', [gymId]);

    if (userIds.length) {
      const values = userIds.map((uid) => [uid, gymId]);
      await conn.query(
        `
          INSERT INTO coaches (user_id, gym_id, is_active)
          VALUES ?
        `,
        [values]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  list,
  listAll,
  findById,
  create,
  update,
  softDelete,
  getImages,
  replaceImages,
  getCoaches,
  replaceCoaches,
};

