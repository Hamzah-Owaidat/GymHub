const Session = require('../../../models/Session');
const Coach = require('../../../models/Coach');
const Gym = require('../../../models/Gym');
const UserSubscription = require('../../../models/UserSubscription');
const Payment = require('../../../models/Payment');
const AppError = require('../../../utils/AppError');

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function normalizeTime(value) {
  const raw = (value || '').toString().trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function toMinutes(time) {
  const normalized = normalizeTime(time);
  if (!normalized) return null;
  const [h, m] = normalized.split(':').map(Number);
  return h * 60 + m;
}

function minuteToTime(minute) {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function subtractBusyFromWindows(windows, busyIntervals) {
  let free = [...windows];
  for (const busy of busyIntervals) {
    const next = [];
    for (const w of free) {
      if (busy.end <= w.start || busy.start >= w.end) {
        next.push(w);
        continue;
      }
      if (busy.start > w.start) next.push({ start: w.start, end: busy.start });
      if (busy.end < w.end) next.push({ start: busy.end, end: w.end });
    }
    free = next;
  }
  return free.filter((w) => w.end > w.start);
}

function isValidVisibility(value) {
  return value === 'private' || value === 'public';
}

function resolveVisibilityFromSlotMode(slotMode, requestedVisibility) {
  if (slotMode === 'private_only') return { visibility: 'private', forced: true };
  if (slotMode === 'public_only') return { visibility: 'public', forced: true };
  if (slotMode === 'both') {
    if (!isValidVisibility(requestedVisibility)) {
      throw new AppError('session_visibility is required (private/public) for this slot', 400);
    }
    return { visibility: requestedVisibility, forced: false };
  }
  throw new AppError(`Invalid slot_mode: ${slotMode}`, 400);
}

function findCoveringWindow(windows, startMinute, endMinute) {
  return windows.find((window) => {
    const windowStart = toMinutes(window.start_time);
    const windowEnd = toMinutes(window.end_time);
    return windowStart !== null && windowEnd !== null && startMinute >= windowStart && endMinute <= windowEnd;
  }) || null;
}

async function buildCoachAvailabilityForDate(coachId, sessionDate) {
  const date = new Date(`${sessionDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new AppError('Invalid session_date', 400);
  }

  const dayName = DAYS[date.getDay()];
  const allAvailability = await Coach.getAvailability(coachId);
  const daySlots = allAvailability
    .filter((slot) => slot.day === dayName)
    .map((slot) => ({
      start: toMinutes(slot.start_time),
      end: toMinutes(slot.end_time),
      slot_mode: slot.slot_mode || (slot.is_private ? 'private_only' : 'public_only'),
    }))
    .filter((slot) => slot.start !== null && slot.end !== null && slot.end > slot.start);

  const busyRows = await Session.listCoachSessionsForDate(coachId, sessionDate);
  const busyIntervals = busyRows
    .map((row) => ({
      start: toMinutes(row.start_time),
      end: toMinutes(row.end_time),
      status: row.status,
    }))
    .filter((row) => row.start !== null && row.end !== null && row.end > row.start)
    .map((row) => ({ start: row.start, end: row.end, status: row.status }));

  const freeIntervalsByMode = daySlots.flatMap((slot) =>
    subtractBusyFromWindows([{ start: slot.start, end: slot.end }], busyIntervals)
      .map((window) => ({ ...window, slot_mode: slot.slot_mode })),
  );

  const suggestedSlots = [];
  for (const interval of freeIntervalsByMode) {
    for (let start = interval.start; start + 60 <= interval.end; start += 30) {
      suggestedSlots.push({
        start_time: minuteToTime(start),
        end_time: minuteToTime(start + 60),
        duration_minutes: 60,
        slot_mode: interval.slot_mode,
      });
    }
  }

  return {
    day: dayName,
    slot_windows: daySlots.map((slot) => ({
      start_time: minuteToTime(slot.start),
      end_time: minuteToTime(slot.end),
      slot_mode: slot.slot_mode,
    })),
    busy_windows: busyIntervals.map((slot) => ({
      start_time: minuteToTime(slot.start),
      end_time: minuteToTime(slot.end),
    })),
    available_windows: freeIntervalsByMode.map((slot) => ({
      start_time: minuteToTime(slot.start),
      end_time: minuteToTime(slot.end),
      slot_mode: slot.slot_mode,
    })),
    suggested_slots: suggestedSlots,
  };
}

async function list(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return next(new AppError('Authentication required', 401));

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const sortBy = req.query.sortBy || 'session_date';
    const sortDir = req.query.sortDir || 'asc';
    const status = req.query.status || undefined;

    const result = await Session.list({ page, limit, sortBy, sortDir, user_id: userId, status });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function getCoachAvailability(req, res, next) {
  try {
    const coachId = Number(req.params.coachId);
    const gymId = Number(req.query.gym_id);
    const sessionDate = req.query.date;

    if (!coachId) return next(new AppError('coachId is required', 400));
    if (!gymId) return next(new AppError('gym_id is required', 400));
    if (!sessionDate) return next(new AppError('date is required', 400));

    const gym = await Gym.findById(gymId);
    if (!gym || !gym.is_active) return next(new AppError('Gym not found', 404));

    const coach = await Coach.findById(coachId);
    if (!coach || !coach.is_active) return next(new AppError('Coach not found', 404));
    if (coach.gym_id !== gymId) return next(new AppError('Coach does not belong to this gym', 400));

    const availability = await buildCoachAvailabilityForDate(coachId, sessionDate);
    res.json({
      success: true,
      coach_id: coachId,
      gym_id: gymId,
      date: sessionDate,
      ...availability,
    });
  } catch (err) {
    next(err);
  }
}

async function book(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return next(new AppError('Authentication required', 401));

    const { gym_id, coach_id, session_date, start_time, end_time, session_visibility, payment_method, card_last4 } = req.body || {};

    if (!gym_id) return next(new AppError('gym_id is required', 400));
    if (!coach_id) return next(new AppError('coach_id is required', 400));
    if (!session_date) return next(new AppError('session_date is required', 400));
    if (!start_time || !end_time) return next(new AppError('start_time and end_time are required', 400));
    if (start_time >= end_time) return next(new AppError('start_time must be before end_time', 400));

    const gym = await Gym.findById(Number(gym_id));
    if (!gym || !gym.is_active) return next(new AppError('Gym not found', 404));

    const coach = await Coach.findById(Number(coach_id));
    if (!coach || !coach.is_active) return next(new AppError('Coach not found', 404));
    if (coach.gym_id !== Number(gym_id)) return next(new AppError('Coach does not belong to this gym', 400));

    const normalizedStart = normalizeTime(start_time);
    const normalizedEnd = normalizeTime(end_time);
    if (!normalizedStart || !normalizedEnd) {
      return next(new AppError('Invalid start_time or end_time format', 400));
    }

    const availability = await buildCoachAvailabilityForDate(Number(coach_id), session_date);
    const requestedStart = toMinutes(normalizedStart);
    const requestedEnd = toMinutes(normalizedEnd);
    const coveringWindow = findCoveringWindow(availability.available_windows, requestedStart, requestedEnd);
    if (!coveringWindow) {
      return next(new AppError('Selected time is outside coach availability for this date', 409));
    }
    const resolved = resolveVisibilityFromSlotMode(coveringWindow.slot_mode, session_visibility);
    const isPrivateSession = resolved.visibility === 'private';

    const overlap = await Session.hasOverlappingCoachSession(
      Number(coach_id), session_date, start_time, end_time,
    );
    if (overlap) return next(new AppError('Coach is not available at that time (overlapping session)', 409));

    const activeSub = await UserSubscription.activeForGym(userId, Number(gym_id));

    let sessionPrice = 0;
    let requiresPayment = false;

    if (!activeSub) {
      const coachPrice = coach.price_per_session ? Number(coach.price_per_session) : 0;
      const gymPrice = gym.session_price ? Number(gym.session_price) : 0;
      sessionPrice = coachPrice || gymPrice;

      if (sessionPrice <= 0) {
        return next(new AppError('You need an active subscription or the gym must set a per-session price', 400));
      }
      requiresPayment = true;
    }

    const sessionId = await Session.create({
      user_id: userId,
      gym_id: Number(gym_id),
      coach_id: Number(coach_id),
      session_date,
      start_time,
      end_time,
      price: requiresPayment ? sessionPrice : 0,
      status: 'booked',
      is_private: isPrivateSession,
    });

    if (requiresPayment) {
      const method = payment_method === 'card' ? 'card' : 'cash';
      await Payment.create({
        user_id: userId,
        gym_id: Number(gym_id),
        subscription_id: null,
        session_id: sessionId,
        amount: sessionPrice,
        method: method === 'card' && card_last4 ? `card ****${card_last4}` : method,
        status: 'paid',
      });
    }

    const session = await Session.findById(sessionId);

    res.status(201).json({
      success: true,
      session,
      session_visibility: resolved.visibility,
      payment_required: requiresPayment,
      amount_charged: requiresPayment ? sessionPrice : 0,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getCoachAvailability, book };
