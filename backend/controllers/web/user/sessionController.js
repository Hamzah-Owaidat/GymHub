const Session = require('../../../models/Session');
const Coach = require('../../../models/Coach');
const Gym = require('../../../models/Gym');
const UserSubscription = require('../../../models/UserSubscription');
const Payment = require('../../../models/Payment');
const AppError = require('../../../utils/AppError');

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

async function book(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return next(new AppError('Authentication required', 401));

    const { gym_id, coach_id, session_date, start_time, end_time, payment_method, card_last4 } = req.body || {};

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

    const overlap = await Session.hasOverlappingPrivateSession(
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
      is_private: true,
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
      payment_required: requiresPayment,
      amount_charged: requiresPayment ? sessionPrice : 0,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, book };
