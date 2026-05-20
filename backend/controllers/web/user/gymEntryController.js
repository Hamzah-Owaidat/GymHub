const UserSubscription = require('../../../models/UserSubscription');
const AppError = require('../../../utils/AppError');
const { buildPayload } = require('../../../utils/entryQr');

async function getEntryQr(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return next(new AppError('Authentication required', 401));

    const subscriptionId = Number(req.params.id);
    if (!subscriptionId) return next(new AppError('Invalid subscription id', 400));

    const sub = await UserSubscription.findByIdForUser(subscriptionId, userId);
    if (!sub) return next(new AppError('Subscription not found', 404));

    const check = UserSubscription.isEntryAllowed(sub);
    if (!check.allowed) return next(new AppError(check.reason, 403));

    const qr_token = await UserSubscription.ensureQrToken(sub.id);
    const qr_payload = buildPayload(qr_token);

    res.json({
      success: true,
      data: {
        subscription_id: sub.id,
        gym_id: sub.gym_id,
        gym_name: sub.gym_name,
        plan_name: sub.plan_name,
        end_date: sub.end_date,
        qr_payload,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getEntryQr,
};
