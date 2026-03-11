const Payment = require('../../../models/Payment');
const AppError = require('../../../utils/AppError');
const ExcelJS = require('exceljs');
const { isValidPaymentStatus } = require('../../../constants/paymentStatus');

const PAYMENT_METHODS = ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'online'];

function parseListQuery(query) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const sortBy = query.sortBy || undefined;
  const sortDir = query.sortDir || undefined;
  const search = query.search || undefined;
  const gym_id = query.gym_id ? Number(query.gym_id) : undefined;
  const user_id = query.user_id ? Number(query.user_id) : undefined;
  const status = query.status || undefined;
  const method = query.method || undefined;
  return { page, limit, sortBy, sortDir, search, gym_id, user_id, status, method };
}

async function list(req, res, next) {
  try {
    const options = parseListQuery(req.query);
    const result = await Payment.list(options);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid payment id', 400));
    const payment = await Payment.findById(id);
    if (!payment) return next(new AppError('Payment not found', 404));
    res.json({ success: true, payment });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { user_id, gym_id, subscription_id, session_id, amount, method, status } = req.body || {};

    if (!user_id || Number.isNaN(Number(user_id))) return next(new AppError('user_id is required', 400));
    if (!gym_id || Number.isNaN(Number(gym_id))) return next(new AppError('gym_id is required', 400));
    if (amount === undefined || amount === null || Number.isNaN(Number(amount))) return next(new AppError('amount is required', 400));

    const safeStatus = status && isValidPaymentStatus(status) ? status : 'pending';

    const id = await Payment.create({
      user_id: Number(user_id),
      gym_id: Number(gym_id),
      subscription_id: subscription_id ? Number(subscription_id) : null,
      session_id: session_id ? Number(session_id) : null,
      amount: Number(amount),
      method: method || null,
      status: safeStatus,
    });

    const payment = await Payment.findById(id);
    res.status(201).json({ success: true, payment });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid payment id', 400));

    const { user_id, gym_id, subscription_id, session_id, amount, method, status } = req.body || {};

    const data = {};
    if (user_id !== undefined) data.user_id = Number(user_id);
    if (gym_id !== undefined) data.gym_id = Number(gym_id);
    if (subscription_id !== undefined) data.subscription_id = subscription_id ? Number(subscription_id) : null;
    if (session_id !== undefined) data.session_id = session_id ? Number(session_id) : null;
    if (amount !== undefined) data.amount = Number(amount);
    if (method !== undefined) data.method = method || null;
    if (status !== undefined && isValidPaymentStatus(status)) data.status = status;

    const ok = await Payment.update(id, data);
    if (!ok) return next(new AppError('Payment not found or not updated', 404));

    const payment = await Payment.findById(id);
    if (!payment) return next(new AppError('Payment not found', 404));
    res.json({ success: true, payment });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid payment id', 400));
    const ok = await Payment.softDelete(id);
    if (!ok) return next(new AppError('Payment not found', 404));
    res.json({ success: true, message: 'Payment deleted' });
  } catch (err) {
    next(err);
  }
}

async function exportExcel(req, res, next) {
  try {
    const { sortBy, sortDir, search, gym_id, user_id, status, method } = parseListQuery(req.query);
    const result = await Payment.list({ page: 1, limit: 100000, sortBy, sortDir, search, gym_id, user_id, status, method });
    const rows = result.data;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Payments');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'User', key: 'user', width: 28 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Gym', key: 'gym', width: 24 },
      { header: 'Subscription ID', key: 'subscription_id', width: 16 },
      { header: 'Session ID', key: 'session_id', width: 14 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Method', key: 'method', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Created At', key: 'created_at', width: 24 },
    ];

    rows.forEach((r) => {
      sheet.addRow({
        id: r.id,
        user: `${r.user_first_name || ''} ${r.user_last_name || ''}`.trim(),
        email: r.user_email || '',
        gym: r.gym_name || '',
        subscription_id: r.subscription_id || '',
        session_id: r.session_id || '',
        amount: r.amount,
        method: r.method || '',
        status: r.status,
        created_at: r.created_at,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="payments.xlsx"');
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove, exportExcel, PAYMENT_METHODS };
