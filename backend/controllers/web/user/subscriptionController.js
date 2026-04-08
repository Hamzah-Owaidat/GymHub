const SubscriptionPlan = require('../../../models/SubscriptionPlan');
const UserSubscription = require('../../../models/UserSubscription');
const Payment = require('../../../models/Payment');
const AppError = require('../../../utils/AppError');

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function list(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return next(new AppError('Authentication required', 401));

    const rows = await UserSubscription.listByUser(userId);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return next(new AppError('Authentication required', 401));

    const { plan_id, payment_method, card_last4 } = req.body || {};
    if (payment_method !== 'cash' && payment_method !== 'card') {
      return next(new AppError('payment_method must be cash or card', 400));
    }
    if (payment_method === 'card') {
      const last4 = (card_last4 || '').toString().trim();
      if (!/^\d{4}$/.test(last4)) {
        return next(new AppError('card_last4 must be exactly 4 digits for card payments', 400));
      }
    }

    const planIdNum = Number(plan_id);
    if (!planIdNum || Number.isNaN(planIdNum)) {
      return next(new AppError('plan_id is required', 400));
    }

    const plan = await SubscriptionPlan.findById(planIdNum);
    if (!plan || !plan.is_active) {
      return next(new AppError('Plan not found', 404));
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const startDate = `${yyyy}-${mm}-${dd}`;
    const endDate = addDays(startDate, plan.duration_days);

    const subscriptionId = await UserSubscription.create({
      user_id: userId,
      gym_id: plan.gym_id,
      plan_id: plan.id,
      start_date: startDate,
      end_date: endDate,
      status: 'active',
    });

    const method = payment_method;
    const status = method === 'cash' ? 'paid' : 'paid';
    const amount = plan.price;

    await Payment.create({
      user_id: userId,
      gym_id: plan.gym_id,
      subscription_id: subscriptionId,
      session_id: null,
      amount,
      method: method === 'card' && card_last4 ? `card ****${card_last4}` : method,
      status,
    });

    const rows = await UserSubscription.listByUser(userId);
    res.status(201).json({ success: true, subscriptions: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  create,
};

