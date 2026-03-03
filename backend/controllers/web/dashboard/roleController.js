const ExcelJS = require('exceljs');
const Role = require('../../../models/Role');
const Permission = require('../../../models/Permission');
const AppError = require('../../../utils/AppError');

function parsePagination(query) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const sortBy = query.sortBy || undefined;
  const sortDir = query.sortDir || undefined;
  const search = query.search || undefined;
  return { page, limit, sortBy, sortDir, search };
}

async function list(req, res, next) {
  try {
    const { page, limit, sortBy, sortDir, search } = parsePagination(req.query);
    const result = await Role.list({ page, limit, sortBy, sortDir, search });

    const dataWithPermissions = await Promise.all(
      result.data.map(async (role) => {
        const permissions = await Role.getPermissions(role.id);
        return { ...role, permissions };
      })
    );

    res.json({
      success: true,
      data: dataWithPermissions,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid role id', 400));

    const role = await Role.findById(id);
    if (!role) return next(new AppError('Role not found', 404));

    const permissions = await Role.getPermissions(id);

    res.json({ success: true, role, permissions });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, description, permission_ids } = req.body;
    if (!name || typeof name !== 'string') {
      return next(new AppError('Role name is required', 400));
    }

    const id = await Role.create({ name: name.trim(), description: description || null });

    // Optional: assign permissions during create
    if (Array.isArray(permission_ids)) {
      if (permission_ids.length) {
        const existing = await Permission.listAll({});
        const existingIds = new Set(existing.map((p) => p.id));
        const invalid = permission_ids.filter((val) => !existingIds.has(Number(val)));
        if (invalid.length) {
          return next(new AppError('One or more permissions do not exist', 400));
        }
      }
      await Role.setPermissions(id, permission_ids.map((v) => Number(v)));
    }

    const role = await Role.findById(id);
    const permissions = await Role.getPermissions(id);

    res.status(201).json({ success: true, role, permissions });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid role id', 400));

    const { name, description, permission_ids } = req.body;
    if (name !== undefined && typeof name !== 'string') {
      return next(new AppError('Invalid name', 400));
    }

    const ok = await Role.update(id, {
      name: name !== undefined ? name.trim() : undefined,
      description,
    });
    if (!ok) return next(new AppError('Role not found or not updated', 404));

    // Optional: replace permissions during update
    if (Array.isArray(permission_ids)) {
      if (permission_ids.length) {
        const existing = await Permission.listAll({});
        const existingIds = new Set(existing.map((p) => p.id));
        const invalid = permission_ids.filter((val) => !existingIds.has(Number(val)));
        if (invalid.length) {
          return next(new AppError('One or more permissions do not exist', 400));
        }
      }
      await Role.setPermissions(id, permission_ids.map((v) => Number(v)));
    }

    const role = await Role.findById(id);
    const permissions = await Role.getPermissions(id);

    res.json({ success: true, role, permissions });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid role id', 400));

    const ok = await Role.softDelete(id);
    if (!ok) return next(new AppError('Role not found', 404));

    res.json({ success: true, message: 'Role deleted' });
  } catch (err) {
    next(err);
  }
}

async function getPermissions(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid role id', 400));

    const role = await Role.findById(id);
    if (!role) return next(new AppError('Role not found', 404));

    const permissions = await Role.getPermissions(id);
    res.json({ success: true, role, permissions });
  } catch (err) {
    next(err);
  }
}

async function updatePermissions(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid role id', 400));

    const role = await Role.findById(id);
    if (!role) return next(new AppError('Role not found', 404));

    const { permission_ids } = req.body;
    if (!Array.isArray(permission_ids)) {
      return next(new AppError('permission_ids must be an array of ids', 400));
    }

    if (permission_ids.length) {
      const [existing] = await Promise.all([
        Permission.listAll({}),
      ]);
      const existingIds = new Set(existing.map((p) => p.id));
      const invalid = permission_ids.filter((idVal) => !existingIds.has(Number(idVal)));
      if (invalid.length) {
        return next(new AppError('One or more permissions do not exist', 400));
      }
    }

    await Role.setPermissions(id, permission_ids.map((v) => Number(v)));

    const permissions = await Role.getPermissions(id);
    res.json({ success: true, role, permissions });
  } catch (err) {
    next(err);
  }
}

async function exportExcel(req, res, next) {
  try {
    const { sortBy, sortDir, search } = parsePagination(req.query);
    const rows = await Role.listAll({ sortBy, sortDir, search });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Roles');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Created At', key: 'created_at', width: 24 },
      { header: 'Updated At', key: 'updated_at', width: 24 },
    ];

    rows.forEach((row) => {
      sheet.addRow({
        id: row.id,
        name: row.name,
        description: row.description || '',
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="roles.xlsx"'
    );
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  getPermissions,
  updatePermissions,
  exportExcel,
};

