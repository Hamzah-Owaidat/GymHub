const { pool } = require('../config/db');

/**
 * Permission model – DB helper functions for permissions.
 * Table expected:
 * - permissions (id, code, name, description, created_at, updated_at, deleted_at NULLABLE)
 */

function buildListQuery({ search }) {
  const where = ['p.deleted_at IS NULL'];
  const params = [];

  if (search) {
    where.push('(p.code LIKE ? OR p.name LIKE ? OR p.description LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const baseSql = `
    SELECT
      p.id,
      p.code,
      p.name,
      p.description,
      p.created_at,
      p.updated_at
    FROM permissions p
    ${whereSql}
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM permissions p
    ${whereSql}
  `;

  return { baseSql, countSql, params };
}

async function list({ search, page = 1, limit = 20, sortBy = 'code', sortDir = 'asc' } = {}) {
  const allowedSort = new Set(['id', 'code', 'name', 'created_at', 'updated_at']);
  const sortColumn = allowedSort.has(sortBy) ? sortBy : 'code';
  const direction = sortDir && sortDir.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  const offset = (Number(page) - 1) * Number(limit);
  const { baseSql, countSql, params } = buildListQuery({ search });

  const [countRows] = await pool.query(countSql, params);
  const total = countRows[0] ? countRows[0].total : 0;

  const [rows] = await pool.query(
    `${baseSql} ORDER BY p.${sortColumn} ${direction} LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );

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

async function listAll({ search, sortBy = 'code', sortDir = 'asc' } = {}) {
  const allowedSort = new Set(['id', 'code', 'name', 'created_at', 'updated_at']);
  const sortColumn = allowedSort.has(sortBy) ? sortBy : 'code';
  const direction = sortDir && sortDir.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  const { baseSql, params } = buildListQuery({ search });
  const [rows] = await pool.query(
    `${baseSql} ORDER BY p.${sortColumn} ${direction}`,
    params
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    `
      SELECT
        p.id,
        p.code,
        p.name,
        p.description,
        p.created_at,
        p.updated_at
      FROM permissions p
      WHERE p.id = ? AND p.deleted_at IS NULL
      LIMIT 1
    `,
    [id]
  );
  return rows[0] || null;
}

async function create({ code, name, description = null }) {
  const [result] = await pool.query(
    `
      INSERT INTO permissions (code, name, description)
      VALUES (?, ?, ?)
    `,
    [code, name, description]
  );
  return result.insertId;
}

async function update(id, { code, name, description = null }) {
  const fields = [];
  const params = [];

  if (typeof code === 'string') {
    fields.push('code = ?');
    params.push(code);
  }
  if (typeof name === 'string') {
    fields.push('name = ?');
    params.push(name);
  }
  if (description !== undefined) {
    fields.push('description = ?');
    params.push(description);
  }

  if (!fields.length) return false;

  params.push(id);

  const [result] = await pool.query(
    `
      UPDATE permissions
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
      UPDATE permissions
      SET deleted_at = NOW()
      WHERE id = ? AND deleted_at IS NULL
    `,
    [id]
  );
  return result.affectedRows > 0;
}

module.exports = {
  list,
  listAll,
  findById,
  create,
  update,
  softDelete,
};

