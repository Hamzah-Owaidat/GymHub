const Session = require('../../../models/Session');
const AppError = require('../../../utils/AppError');
const ExcelJS = require('exceljs');
const { isValidSessionStatus } = require('../../../constants/sessionStatus');

function parseListQuery(query) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const sortBy = query.sortBy || undefined;
  const sortDir = query.sortDir || undefined;
  const search = query.search || undefined;
  const gym_id = query.gym_id ? Number(query.gym_id) : undefined;
  const coach_id = query.coach_id ? Number(query.coach_id) : undefined;
  const user_id = query.user_id ? Number(query.user_id) : undefined;
  const status = query.status || undefined;
  return { page, limit, sortBy, sortDir, search, gym_id, coach_id, user_id, status };
}

async function list(req, res, next) {
  try {
    const options = parseListQuery(req.query);
    const result = await Session.list(options);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid session id', 400));
    const session = await Session.findById(id);
    if (!session) return next(new AppError('Session not found', 404));
    res.json({ success: true, session });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { user_id, gym_id, coach_id, session_date, start_time, end_time, price, status } = req.body || {};

    if (!user_id || Number.isNaN(Number(user_id))) return next(new AppError('user_id is required', 400));
    if (!gym_id || Number.isNaN(Number(gym_id))) return next(new AppError('gym_id is required', 400));
    if (!session_date) return next(new AppError('session_date is required', 400));
    if (!start_time) return next(new AppError('start_time is required', 400));
    if (!end_time) return next(new AppError('end_time is required', 400));

    const safeStatus = status && isValidSessionStatus(status) ? status : 'booked';

    const id = await Session.create({
      user_id: Number(user_id),
      gym_id: Number(gym_id),
      coach_id: coach_id ? Number(coach_id) : null,
      session_date,
      start_time,
      end_time,
      price: price !== undefined && price !== null && price !== '' ? Number(price) : null,
      status: safeStatus,
    });

    const session = await Session.findById(id);
    res.status(201).json({ success: true, session });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid session id', 400));

    const { user_id, gym_id, coach_id, session_date, start_time, end_time, price, status } = req.body || {};

    const data = {};
    if (user_id !== undefined) data.user_id = Number(user_id);
    if (gym_id !== undefined) data.gym_id = Number(gym_id);
    if (coach_id !== undefined) data.coach_id = coach_id ? Number(coach_id) : null;
    if (session_date !== undefined) data.session_date = session_date;
    if (start_time !== undefined) data.start_time = start_time;
    if (end_time !== undefined) data.end_time = end_time;
    if (price !== undefined) data.price = price !== null && price !== '' ? Number(price) : null;
    if (status !== undefined && isValidSessionStatus(status)) data.status = status;

    const ok = await Session.update(id, data);
    if (!ok) return next(new AppError('Session not found or not updated', 404));

    const session = await Session.findById(id);
    if (!session) return next(new AppError('Session not found', 404));
    res.json({ success: true, session });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid session id', 400));
    const ok = await Session.softDelete(id);
    if (!ok) return next(new AppError('Session not found', 404));
    res.json({ success: true, message: 'Session deleted' });
  } catch (err) {
    next(err);
  }
}

async function exportExcel(req, res, next) {
  try {
    const { sortBy, sortDir, search, gym_id, coach_id, user_id, status } = parseListQuery(req.query);
    const result = await Session.list({ page: 1, limit: 100000, sortBy, sortDir, search, gym_id, coach_id, user_id, status });
    const rows = result.data;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sessions');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'User', key: 'user', width: 28 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Gym', key: 'gym', width: 24 },
      { header: 'Coach', key: 'coach', width: 24 },
      { header: 'Date', key: 'session_date', width: 14 },
      { header: 'Start', key: 'start_time', width: 10 },
      { header: 'End', key: 'end_time', width: 10 },
      { header: 'Price', key: 'price', width: 12 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Created At', key: 'created_at', width: 24 },
      { header: 'Updated At', key: 'updated_at', width: 24 },
    ];

    rows.forEach((r) => {
      sheet.addRow({
        id: r.id,
        user: `${r.user_first_name || ''} ${r.user_last_name || ''}`.trim(),
        email: r.user_email || '',
        gym: r.gym_name || '',
        coach: r.coach_first_name ? `${r.coach_first_name} ${r.coach_last_name || ''}`.trim() : '',
        session_date: r.session_date,
        start_time: r.start_time,
        end_time: r.end_time,
        price: r.price,
        status: r.status,
        created_at: r.created_at,
        updated_at: r.updated_at,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="sessions.xlsx"');
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove, exportExcel };
