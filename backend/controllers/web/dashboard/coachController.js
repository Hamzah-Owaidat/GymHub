const Coach = require('../../../models/Coach');
const AppError = require('../../../utils/AppError');
const ExcelJS = require('exceljs');
const notificationService = require('../../../services/notificationService');
const { isValidDay } = require('../../../constants/days');

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
    const result = await Coach.list(options);

    const dataWithAvailability = await Promise.all(
      result.data.map(async (coach) => {
        const availability = await Coach.getAvailability(coach.id);
        return { ...coach, availability };
      }),
    );

    res.json({ success: true, data: dataWithAvailability, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid coach id', 400));

    const coach = await Coach.findById(id);
    if (!coach) return next(new AppError('Coach not found', 404));

    coach.availability = await Coach.getAvailability(id);

    res.json({ success: true, coach });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const {
      user_id,
      gym_id,
      specialization,
      bio,
      price_per_session,
      is_active,
      availability,
    } = req.body || {};

    if (!user_id || Number.isNaN(Number(user_id))) {
      return next(new AppError('user_id is required', 400));
    }
    if (!gym_id || Number.isNaN(Number(gym_id))) {
      return next(new AppError('gym_id is required', 400));
    }

    if (Array.isArray(availability)) {
      for (const slot of availability) {
        if (!isValidDay(slot.day)) {
          return next(new AppError(`Invalid day: ${slot.day}`, 400));
        }
      }
    }

    const id = await Coach.create({
      user_id: Number(user_id),
      gym_id: Number(gym_id),
      specialization: specialization || null,
      bio: bio || null,
      price_per_session:
        price_per_session !== undefined && price_per_session !== null
          ? Number(price_per_session)
          : null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
    });

    if (Array.isArray(availability) && availability.length) {
      await Coach.replaceAvailability(id, availability);
    }

    const coach = await Coach.findById(id);
    coach.availability = await Coach.getAvailability(id);
    res.status(201).json({ success: true, coach });

    try {
      await notificationService.sendAndBroadcastToUser(coach.user_id, {
        title: 'New gym assignment',
        message: `You have been assigned as a coach at gym "${coach.gym_name}".`,
        type: 'system',
      });
    } catch (notifyErr) {
      console.error('Failed to send coach assignment notification:', notifyErr);
    }
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid coach id', 400));

    const {
      user_id,
      gym_id,
      specialization,
      bio,
      price_per_session,
      is_active,
      availability,
    } = req.body || {};

    if (Array.isArray(availability)) {
      for (const slot of availability) {
        if (!isValidDay(slot.day)) {
          return next(new AppError(`Invalid day: ${slot.day}`, 400));
        }
      }
    }

    const data = {};
    if (user_id !== undefined) data.user_id = Number(user_id);
    if (gym_id !== undefined) data.gym_id = Number(gym_id);
    if (specialization !== undefined) data.specialization = specialization || null;
    if (bio !== undefined) data.bio = bio || null;
    if (price_per_session !== undefined) {
      data.price_per_session =
        price_per_session !== null && price_per_session !== ''
          ? Number(price_per_session)
          : null;
    }
    if (is_active !== undefined) data.is_active = Boolean(is_active);

    const ok = await Coach.update(id, data);
    if (!ok) return next(new AppError('Coach not found or not updated', 404));

    if (Array.isArray(availability)) {
      await Coach.replaceAvailability(id, availability);
    }

    const coach = await Coach.findById(id);
    if (!coach) return next(new AppError('Coach not found', 404));
    coach.availability = await Coach.getAvailability(id);

    res.json({ success: true, coach });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid coach id', 400));

    const coach = await Coach.findById(id);
    if (!coach) return next(new AppError('Coach not found', 404));
    const coachName = `${coach.user_first_name || ''} ${coach.user_last_name || ''}`.trim() || 'Coach';
    const gymName = coach.gym_name || '';

    await Coach.deleteAvailability(id);

    const ok = await Coach.softDelete(id);
    if (!ok) return next(new AppError('Coach not found', 404));

    res.json({ success: true, message: 'Coach deleted' });

    try {
      await notificationService.sendAndBroadcastToUser(coach.user_id, {
        title: 'Coach assignment removed',
        message: `${coachName}, your assignment at gym "${gymName}" has been removed.`,
        type: 'system',
      });
    } catch (notifyErr) {
      console.error('Failed to send coach delete notification:', notifyErr);
    }
  } catch (err) {
    next(err);
  }
}

async function exportExcel(req, res, next) {
  try {
    const { sortBy, sortDir, search, gym_id, is_active } = parseListQuery(req.query);
    const result = await Coach.list({
      page: 1,
      limit: 100000,
      sortBy,
      sortDir,
      search,
      gym_id,
      is_active,
    });
    const rows = result.data;

    const rowsWithAvailability = await Promise.all(
      rows.map(async (row) => {
        const availability = await Coach.getAvailability(row.id);
        return { ...row, availability };
      }),
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Coaches');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'User ID', key: 'user_id', width: 10 },
      { header: 'First Name', key: 'user_first_name', width: 18 },
      { header: 'Last Name', key: 'user_last_name', width: 18 },
      { header: 'Email', key: 'user_email', width: 28 },
      { header: 'Gym ID', key: 'gym_id', width: 10 },
      { header: 'Gym Name', key: 'gym_name', width: 28 },
      { header: 'Specialization', key: 'specialization', width: 24 },
      { header: 'Bio', key: 'bio', width: 40 },
      { header: 'Price / session', key: 'price_per_session', width: 16 },
      { header: 'Availability', key: 'availability', width: 50 },
      { header: 'Active', key: 'is_active', width: 10 },
      { header: 'Created At', key: 'created_at', width: 24 },
      { header: 'Updated At', key: 'updated_at', width: 24 },
    ];

    rowsWithAvailability.forEach((row) => {
      const availStr = (row.availability || [])
        .map((a) => {
          const time = a.start_time && a.end_time
            ? ` ${a.start_time.toString().slice(0, 5)}-${a.end_time.toString().slice(0, 5)}`
            : '';
          return `${a.day}${time}`;
        })
        .join(', ');

      sheet.addRow({
        id: row.id,
        user_id: row.user_id,
        user_first_name: row.user_first_name,
        user_last_name: row.user_last_name,
        user_email: row.user_email,
        gym_id: row.gym_id,
        gym_name: row.gym_name,
        specialization: row.specialization || '',
        bio: row.bio || '',
        price_per_session: row.price_per_session,
        availability: availStr || 'N/A',
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
    res.setHeader('Content-Disposition', 'attachment; filename="coaches.xlsx"');
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

