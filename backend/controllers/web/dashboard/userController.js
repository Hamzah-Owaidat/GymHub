const ExcelJS = require('exceljs');
const bcrypt = require('bcryptjs');
const User = require('../../../models/User');
const AppError = require('../../../utils/AppError');

function parseListQuery(query) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const sortBy = query.sortBy || undefined;
  const sortDir = query.sortDir || undefined;
  const search = query.search || undefined;
  const role_id = query.role_id ? Number(query.role_id) : undefined;

  let is_active;
  if (query.is_active === 'true') is_active = true;
  else if (query.is_active === 'false') is_active = false;

  return { page, limit, sortBy, sortDir, search, role_id, is_active };
}

async function list(req, res, next) {
  try {
    const options = parseListQuery(req.query);
    const result = await User.list(options);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid user id', 400));

    const user = await User.findById(id);
    if (!user) return next(new AppError('User not found', 404));

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      role_id,
      dob,
      phone,
    } = req.body || {};

    if (!first_name || typeof first_name !== 'string') {
      return next(new AppError('First name is required', 400));
    }
    if (!last_name || typeof last_name !== 'string') {
      return next(new AppError('Last name is required', 400));
    }
    if (!email || typeof email !== 'string') {
      return next(new AppError('Email is required', 400));
    }
    if (!password || typeof password !== 'string') {
      return next(new AppError('Password is required', 400));
    }
    if (!role_id || Number.isNaN(Number(role_id))) {
      return next(new AppError('role_id is required', 400));
    }

    const exists = await User.existsByEmail(email);
    if (exists) {
      return next(new AppError('Email already registered', 409));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created_by = req.user ? req.user.id : null;

    const userId = await User.create({
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.trim(),
      passwordHash,
      role_id: Number(role_id),
      dob: dob || null,
      phone: phone || null,
      created_by,
    });

    const user = await User.findById(userId);
    if (!user) return next(new AppError('User not found after create', 500));

    res.status(201).json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid user id', 400));

    const {
      first_name,
      last_name,
      email,
      role_id,
      dob,
      phone,
      is_active,
    } = req.body || {};

    if (email !== undefined && typeof email !== 'string') {
      return next(new AppError('Invalid email', 400));
    }

    const data = {};
    if (first_name !== undefined) data.first_name = String(first_name).trim();
    if (last_name !== undefined) data.last_name = String(last_name).trim();
    if (email !== undefined) data.email = email.trim();
    if (role_id !== undefined) data.role_id = Number(role_id);
    if (dob !== undefined) data.dob = dob || null;
    if (phone !== undefined) data.phone = phone || null;
    if (is_active !== undefined) {
      data.is_active = Boolean(is_active);
    }

    const ok = await User.update(id, data);
    if (!ok) return next(new AppError('User not found or not updated', 404));

    const user = await User.findById(id);
    if (!user) return next(new AppError('User not found', 404));

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid user id', 400));

    const ok = await User.softDelete(id);
    if (!ok) return next(new AppError('User not found', 404));

    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    next(err);
  }
}

async function exportExcel(req, res, next) {
  try {
    const { sortBy, sortDir, search, role_id, is_active } = parseListQuery(req.query);
    const rows = await User.listAll({ sortBy, sortDir, search, role_id, is_active });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Users');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'First Name', key: 'first_name', width: 20 },
      { header: 'Last Name', key: 'last_name', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Active', key: 'is_active', width: 10 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'DOB', key: 'dob', width: 15 },
      { header: 'Created At', key: 'created_at', width: 24 },
    ];

    rows.forEach((row) => {
      sheet.addRow({
        id: row.id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        role: row.role,
        is_active: row.is_active ? 'Yes' : 'No',
        phone: row.phone || '',
        dob: row.dob || '',
        created_at: row.created_at,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="users.xlsx"'
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

