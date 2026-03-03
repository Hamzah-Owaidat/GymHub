const { pool } = require('../config/db');

/**
 * Role model – DB helper functions for roles and their permissions.
 * Tables expected:
 * - roles (id, name, description, created_at, updated_at, deleted_at NULLABLE)
 * - role_permissions (id, role_id, permission_id, created_at, deleted_at NULLABLE)
 */

function buildListQuery({ search }) {
  const where = ['r.deleted_at IS NULL'];
  const params = [];

  if (search) {
    where.push('(r.name LIKE ? OR r.description LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const baseSql = `
    SELECT
      r.id,
      r.name,
      r.description,
      r.created_at,
      r.updated_at
    FROM roles r
    ${whereSql}
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM roles r
    ${whereSql}
  `;

  return { baseSql, countSql, params };
}

async function list({ search, page = 1, limit = 20, sortBy = 'created_at', sortDir = 'desc' } = {}) {
  const allowedSort = new Set(['id', 'name', 'created_at', 'updated_at']);
  const sortColumn = allowedSort.has(sortBy) ? sortBy : 'created_at';
  const direction = sortDir && sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const offset = (Number(page) - 1) * Number(limit);
  const { baseSql, countSql, params } = buildListQuery({ search });

  const [countRows] = await pool.query(countSql, params);
  const total = countRows[0] ? countRows[0].total : 0;

  const [rows] = await pool.query(
    `${baseSql} ORDER BY r.${sortColumn} ${direction} LIMIT ? OFFSET ?`,
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

async function listAll({ search, sortBy = 'created_at', sortDir = 'desc' } = {}) {
  const allowedSort = new Set(['id', 'name', 'created_at', 'updated_at']);
  const sortColumn = allowedSort.has(sortBy) ? sortBy : 'created_at';
  const direction = sortDir && sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const { baseSql, params } = buildListQuery({ search });
  const [rows] = await pool.query(
    `${baseSql} ORDER BY r.${sortColumn} ${direction}`,
    params
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    `
      SELECT
        r.id,
        r.name,
        r.description,
        r.created_at,
        r.updated_at
      FROM roles r
      WHERE r.id = ? AND r.deleted_at IS NULL
      LIMIT 1
    `,
    [id]
  );
  return rows[0] || null;
}

async function create({ name, description = null }) {
  const [result] = await pool.query(
    `
      INSERT INTO roles (name, description)
      VALUES (?, ?)
    `,
    [name, description]
  );
  return result.insertId;
}

async function update(id, { name, description = null }) {
  const fields = [];
  const params = [];

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
      UPDATE roles
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
      UPDATE roles
      SET deleted_at = NOW()
      WHERE id = ? AND deleted_at IS NULL
    `,
    [id]
  );
  return result.affectedRows > 0;
}

async function getPermissions(roleId) {
  const [rows] = await pool.query(
    `
      SELECT
        p.id,
        p.code,
        p.name,
        p.description
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id AND p.deleted_at IS NULL
      WHERE rp.role_id = ? AND rp.deleted_at IS NULL
      ORDER BY p.code ASC
    `,
    [roleId]
  );
  return rows;
}

async function setPermissions(roleId, permissionIds = []) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Remove existing links for this role (no soft delete needed for pivot table)
    await conn.query(
      `
        DELETE FROM role_permissions
        WHERE role_id = ?
      `,
      [roleId]
    );

    if (permissionIds.length) {
      const values = permissionIds.map((pid) => [roleId, pid]);
      await conn.query(
        `
          INSERT INTO role_permissions (role_id, permission_id)
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
  getPermissions,
  setPermissions,
};

