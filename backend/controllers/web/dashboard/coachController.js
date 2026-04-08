const Coach = require('../../../models/Coach');
const Session = require('../../../models/Session');
const { pool } = require('../../../config/db');
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

function validateAvailabilitySlots(slots = []) {
  if (!Array.isArray(slots) || !slots.length) return;

  const byDay = new Map();
  const seenSlots = new Set();

  const normalizeTime = (value) => {
    const raw = (value || '').toString().trim();
    const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3] || '0');

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      Number.isNaN(seconds) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59 ||
      seconds < 0 ||
      seconds > 59
    ) {
      return null;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const toMinuteOfDay = (time) => {
    const [hh, mm] = time.split(':');
    return Number(hh) * 60 + Number(mm);
  };

  for (const rawSlot of slots) {
    const slot = {
      day: (rawSlot.day || '').toString().trim().toLowerCase(),
      start_time: normalizeTime(rawSlot.start_time),
      end_time: normalizeTime(rawSlot.end_time),
    };

    if (!isValidDay(slot.day)) {
      throw new AppError(`Invalid day: ${slot.day}`, 400);
    }
    if (!slot.start_time || !slot.end_time) {
      throw new AppError('Availability start_time and end_time are required for each slot', 400);
    }
    const startMinute = toMinuteOfDay(slot.start_time);
    const endMinute = toMinuteOfDay(slot.end_time);
    if (startMinute >= endMinute) {
      throw new AppError(`Availability start_time must be before end_time for ${slot.day}`, 400);
    }

    const slotKey = `${slot.day}|${slot.start_time}|${slot.end_time}`;
    if (seenSlots.has(slotKey)) {
      throw new AppError(`Duplicate availability slot on ${slot.day} ${slot.start_time}-${slot.end_time}`, 400);
    }
    seenSlots.add(slotKey);

    const key = slot.day;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(slot);
  }

  for (const [day, slotsForDay] of byDay.entries()) {
    const sorted = [...slotsForDay].sort((a, b) =>
      a.start_time.localeCompare(b.start_time),
    );
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (toMinuteOfDay(curr.start_time) < toMinuteOfDay(prev.end_time)) {
        throw new AppError(`Availability slots overlap on ${day}`, 400);
      }
    }
  }
}

async function getCurrentCoachForUser(req) {
  const userId = req.user && req.user.id;
  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const [rows] = await pool.query(
    `
      SELECT
        c.id,
        c.user_id,
        c.gym_id,
        c.specialization,
        c.bio,
        c.price_per_session,
        c.is_active,
        c.created_at,
        c.updated_at,
        u.first_name AS user_first_name,
        u.last_name AS user_last_name,
        u.email AS user_email,
        g.name AS gym_name
      FROM coaches c
      JOIN users u ON u.id = c.user_id AND u.deleted_at IS NULL
      JOIN gyms g ON g.id = c.gym_id AND g.deleted_at IS NULL
      WHERE c.user_id = ? AND c.deleted_at IS NULL
      LIMIT 1
    `,
    [userId],
  );

  const coach = rows[0];
  if (!coach) {
    throw new AppError('Coach profile not found', 404);
  }
  return coach;
}

async function list(req, res, next) {
  try {
    const options = parseListQuery(req.query);
    if (req.ownerGymIds) {
      options.gym_ids = req.ownerGymIds;
    }
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

    if (req.ownerGymIds && !req.ownerGymIds.includes(coach.gym_id)) {
      return next(new AppError('Coach not in your gyms', 403));
    }

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
    if (req.ownerGymIds && !req.ownerGymIds.includes(Number(gym_id))) {
      return next(new AppError('You can only add coaches to your own gyms', 403));
    }

    if (Array.isArray(availability) && availability.length) {
      try {
        validateAvailabilitySlots(availability);
      } catch (err) {
        return next(err);
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

    if (req.ownerGymIds) {
      const existing = await Coach.findById(id);
      if (!existing || !req.ownerGymIds.includes(existing.gym_id)) {
        return next(new AppError('Coach not in your gyms', 403));
      }
    }

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
      try {
        validateAvailabilitySlots(availability);
      } catch (err) {
        return next(err);
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

    if (req.ownerGymIds && !req.ownerGymIds.includes(coach.gym_id)) {
      return next(new AppError('Coach not in your gyms', 403));
    }
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
      gym_ids: req.ownerGymIds || undefined,
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

async function listCoachUsers(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE r.name = 'coach'
         AND u.is_active = 1
         AND u.deleted_at IS NULL
       ORDER BY u.first_name, u.last_name`,
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function getSelfProfile(req, res, next) {
  try {
    const coach = await getCurrentCoachForUser(req);
    coach.availability = await Coach.getAvailability(coach.id);
    res.json({ success: true, coach });
  } catch (err) {
    next(err);
  }
}

async function updateMyAvailability(req, res, next) {
  try {
    const coach = await getCurrentCoachForUser(req);
    const { availability } = req.body || {};

    if (!Array.isArray(availability)) {
      return next(new AppError('availability must be an array', 400));
    }

    try {
      validateAvailabilitySlots(availability);
    } catch (err) {
      return next(err);
    }

    await Coach.replaceAvailability(coach.id, availability);
    const updatedAvailability = await Coach.getAvailability(coach.id);
    res.json({ success: true, availability: updatedAvailability });
  } catch (err) {
    next(err);
  }
}

async function listMySessions(req, res, next) {
  try {
    const coach = await getCurrentCoachForUser(req);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const sortBy = req.query.sortBy || undefined;
    const sortDir = req.query.sortDir || undefined;
    const search = req.query.search || undefined;
    const status = req.query.status || undefined;

    const result = await Session.list({
      page,
      limit,
      sortBy,
      sortDir,
      search,
      coach_id: coach.id,
      status,
    });

    res.json({ success: true, ...result });
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
  listCoachUsers,
  getSelfProfile,
  updateMyAvailability,
  listMySessions,
};

