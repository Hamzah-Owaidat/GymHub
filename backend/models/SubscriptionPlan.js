const { pool } = require('../config/db');

/**
 * Subscription plans per gym.
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
  const allowedSort = new Set(['id', 'name', 'price', 'duration_days', 'created_at']);
  const sortColumn = allowedSort.has(sortBy) ? sortBy : 'created_at';
  const direction = sortDir && sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const where = ['p.deleted_at IS NULL'];
  const params = [];

  if (search) {
    const like = `%${search}%`;
    where.push('(p.name LIKE ? OR p.description LIKE ?)');
    params.push(like, like);
  }
  if (Array.isArray(gym_ids) && gym_ids.length) {
    where.push(`p.gym_id IN (${gym_ids.map(() => '?').join(',')})`);
    params.push(...gym_ids);
  } else if (gym_id) {
    where.push('p.gym_id = ?');
    params.push(gym_id);
  }
  if (typeof is_active === 'boolean') {
    where.push('p.is_active = ?');
    params.push(is_active ? 1 : 0);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM subscription_plans p
    ${whereSql}
  `;
  const [countRows] = await pool.query(countSql, params);
  const total = countRows[0] ? countRows[0].total : 0;

  const listSql = `
    SELECT
      p.id,
      p.gym_id,
      g.name AS gym_name,
      p.name,
      p.duration_days,
      p.price,
      p.description,
      p.is_active,
      p.created_at,
      p.updated_at
    FROM subscription_plans p
    JOIN gyms g ON g.id = p.gym_id AND g.deleted_at IS NULL
    ${whereSql}
    ORDER BY p.${sortColumn} ${direction}
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
        p.id,
        p.gym_id,
        g.name AS gym_name,
        p.name,
        p.duration_days,
        p.price,
        p.description,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM subscription_plans p
      JOIN gyms g ON g.id = p.gym_id AND g.deleted_at IS NULL
      WHERE p.id = ? AND p.deleted_at IS NULL
      LIMIT 1
    `,
    [id],
  );
  return rows[0] || null;
}

async function create({
  gym_id,
  name,
  duration_days,
  price,
  description = null,
  is_active = true,
}) {
  const [result] = await pool.query(
    `
      INSERT INTO subscription_plans (gym_id, name, duration_days, price, description, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [gym_id, name, duration_days, price, description, is_active ? 1 : 0],
  );
  return result.insertId;
}

async function update(
  id,
  { gym_id, name, duration_days, price, description, is_active },
) {
  const fields = [];
  const params = [];

  if (gym_id !== undefined) {
    fields.push('gym_id = ?');
    params.push(gym_id);
  }
  if (name !== undefined) {
    fields.push('name = ?');
    params.push(name);
  }
  if (duration_days !== undefined) {
    fields.push('duration_days = ?');
    params.push(duration_days);
  }
  if (price !== undefined) {
    fields.push('price = ?');
    params.push(price);
  }
  if (description !== undefined) {
    fields.push('description = ?');
    params.push(description);
  }
  if (is_active !== undefined) {
    fields.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }

  if (!fields.length) return false;

  params.push(id);

  const [result] = await pool.query(
    `
      UPDATE subscription_plans
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
      UPDATE subscription_plans
      SET deleted_at = NOW(), is_active = FALSE
      WHERE id = ? AND deleted_at IS NULL
    `,
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
};

