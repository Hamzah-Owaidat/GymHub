const ExcelJS = require('exceljs');
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
    const result = await Permission.list({ page, limit, sortBy, sortDir, search });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid permission id', 400));

    const permission = await Permission.findById(id);
    if (!permission) return next(new AppError('Permission not found', 404));

    res.json({ success: true, permission });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { code, name, description } = req.body || {};
    if (!code || typeof code !== 'string') {
      return next(new AppError('Permission code is required', 400));
    }
    if (!name || typeof name !== 'string') {
      return next(new AppError('Permission name is required', 400));
    }

    const id = await Permission.create({
      code: code.trim(),
      name: name.trim(),
      description: description || null,
    });
    const permission = await Permission.findById(id);

    res.status(201).json({ success: true, permission });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid permission id', 400));

    const { code, name, description } = req.body || {};
    if (code !== undefined && typeof code !== 'string') {
      return next(new AppError('Invalid code', 400));
    }
    if (name !== undefined && typeof name !== 'string') {
      return next(new AppError('Invalid name', 400));
    }

    const ok = await Permission.update(id, {
      code: code !== undefined ? code.trim() : undefined,
      name: name !== undefined ? name.trim() : undefined,
      description,
    });
    if (!ok) return next(new AppError('Permission not found or not updated', 404));

    const permission = await Permission.findById(id);
    res.json({ success: true, permission });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid permission id', 400));

    const ok = await Permission.softDelete(id);
    if (!ok) return next(new AppError('Permission not found', 404));

    res.json({ success: true, message: 'Permission deleted' });
  } catch (err) {
    next(err);
  }
}

async function exportExcel(req, res, next) {
  try {
    const { sortBy, sortDir, search } = parsePagination(req.query);
    const rows = await Permission.listAll({ sortBy, sortDir, search });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Permissions');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Code', key: 'code', width: 30 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Created At', key: 'created_at', width: 24 },
      { header: 'Updated At', key: 'updated_at', width: 24 },
    ];

    rows.forEach((row) => {
      sheet.addRow({
        id: row.id,
        code: row.code,
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
      'attachment; filename="permissions.xlsx"'
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
  exportExcel,
};

