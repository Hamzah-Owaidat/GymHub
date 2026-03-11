const SubscriptionPlan = require('../../../models/SubscriptionPlan');
const AppError = require('../../../utils/AppError');
const ExcelJS = require('exceljs');
const notificationService = require('../../../services/notificationService');

function parseListQuery(query) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const sortBy = query.sortBy || undefined;
  const sortDir = query.sortDir || undefined;
  const search = query.search || undefined;
  const gym_id = query.gym_id ? Number(query.gym_id) : undefined;

  let is_active;
  if (query.is_active === 'true') is_active = true;
  else if (query.is_active === 'false') is_active = false;

  return { page, limit, sortBy, sortDir, search, gym_id, is_active };
}

async function list(req, res, next) {
  try {
    const options = parseListQuery(req.query);
    if (req.ownerGymIds) options.gym_ids = req.ownerGymIds;
    const result = await SubscriptionPlan.list(options);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid subscription plan id', 400));

    const plan = await SubscriptionPlan.findById(id);
    if (!plan) return next(new AppError('Subscription plan not found', 404));

    if (req.ownerGymIds && !req.ownerGymIds.includes(plan.gym_id)) {
      return next(new AppError('Plan not in your gyms', 403));
    }

    res.json({ success: true, plan });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const {
      gym_id,
      name,
      duration_days,
      price,
      description,
      is_active,
    } = req.body || {};

    if (!gym_id || Number.isNaN(Number(gym_id))) {
      return next(new AppError('gym_id is required', 400));
    }
    if (req.ownerGymIds && !req.ownerGymIds.includes(Number(gym_id))) {
      return next(new AppError('You can only create plans for your own gyms', 403));
    }
    if (!name || typeof name !== 'string') {
      return next(new AppError('Plan name is required', 400));
    }
    if (!duration_days || Number.isNaN(Number(duration_days))) {
      return next(new AppError('duration_days is required', 400));
    }
    if (price === undefined || price === null || Number.isNaN(Number(price))) {
      return next(new AppError('price is required', 400));
    }

    const id = await SubscriptionPlan.create({
      gym_id: Number(gym_id),
      name: name.trim(),
      duration_days: Number(duration_days),
      price: Number(price),
      description: description || null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
    });

    const plan = await SubscriptionPlan.findById(id);
    res.status(201).json({ success: true, plan });

    // Notify all users about the new subscription plan.
    try {
      await notificationService.sendAndBroadcastToAll({
        title: 'New subscription plan',
        message: `Plan "${plan.name}" for gym "${plan.gym_name}" has been created.`,
        type: 'subscription',
      });
    } catch (notifyErr) {
      // eslint-disable-next-line no-console
      console.error('Failed to send subscription plan create notification:', notifyErr);
    }
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid subscription plan id', 400));

    if (req.ownerGymIds) {
      const existing = await SubscriptionPlan.findById(id);
      if (!existing || !req.ownerGymIds.includes(existing.gym_id)) {
        return next(new AppError('Plan not in your gyms', 403));
      }
    }

    const {
      gym_id,
      name,
      duration_days,
      price,
      description,
      is_active,
    } = req.body || {};

    const data = {};
    if (gym_id !== undefined) data.gym_id = Number(gym_id);
    if (name !== undefined) data.name = String(name).trim();
    if (duration_days !== undefined) data.duration_days = Number(duration_days);
    if (price !== undefined) data.price = Number(price);
    if (description !== undefined) data.description = description || null;
    if (is_active !== undefined) data.is_active = Boolean(is_active);

    const ok = await SubscriptionPlan.update(id, data);
    if (!ok) return next(new AppError('Subscription plan not found or not updated', 404));

    const plan = await SubscriptionPlan.findById(id);
    if (!plan) return next(new AppError('Subscription plan not found', 404));

    res.json({ success: true, plan });

    // Notify all users about the updated subscription plan.
    try {
      await notificationService.sendAndBroadcastToAll({
        title: 'Subscription plan updated',
        message: `Plan "${plan.name}" for gym "${plan.gym_name}" has been updated.`,
        type: 'subscription',
      });
    } catch (notifyErr) {
      // eslint-disable-next-line no-console
      console.error('Failed to send subscription plan update notification:', notifyErr);
    }
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid subscription plan id', 400));

    const plan = await SubscriptionPlan.findById(id);
    if (!plan) return next(new AppError('Subscription plan not found', 404));

    if (req.ownerGymIds && !req.ownerGymIds.includes(plan.gym_id)) {
      return next(new AppError('Plan not in your gyms', 403));
    }
    const planName = plan.name;
    const gymName = plan.gym_name || '';

    const ok = await SubscriptionPlan.softDelete(id);
    if (!ok) return next(new AppError('Subscription plan not found', 404));

    res.json({ success: true, message: 'Subscription plan deleted' });

    try {
      await notificationService.sendAndBroadcastToAll({
        title: 'Subscription plan deleted',
        message: `Plan "${planName}"${gymName ? ` for gym "${gymName}"` : ''} has been deleted.`,
        type: 'subscription',
      });
    } catch (notifyErr) {
      console.error('Failed to send subscription plan delete notification:', notifyErr);
    }
  } catch (err) {
    next(err);
  }
}

async function exportExcel(req, res, next) {
  try {
    const { sortBy, sortDir, search, gym_id, is_active } = parseListQuery(req.query);
    const result = await SubscriptionPlan.list({
      page: 1,
      limit: 100000,
      sortBy,
      sortDir,
      search,
      gym_id,
      gym_ids: req.ownerGymIds || undefined,
      is_active,
    });
    const rows = result.data;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Subscription Plans');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Gym ID', key: 'gym_id', width: 10 },
      { header: 'Gym Name', key: 'gym_name', width: 30 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Duration (days)', key: 'duration_days', width: 16 },
      { header: 'Price', key: 'price', width: 12 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Active', key: 'is_active', width: 10 },
      { header: 'Created At', key: 'created_at', width: 24 },
      { header: 'Updated At', key: 'updated_at', width: 24 },
    ];

    rows.forEach((row) => {
      sheet.addRow({
        id: row.id,
        gym_id: row.gym_id,
        gym_name: row.gym_name,
        name: row.name,
        duration_days: row.duration_days,
        price: row.price,
        description: row.description || '',
        is_active: row.is_active ? 'Yes' : 'No',
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="subscription_plans.xlsx"');
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

