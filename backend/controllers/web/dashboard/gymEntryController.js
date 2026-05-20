const UserSubscription = require('../../../models/UserSubscription');
const AppError = require('../../../utils/AppError');
const { parsePayload } = require('../../../utils/entryQr');

async function verify(req, res, next) {
  try {
    const { code, qr_payload } = req.body || {};
    const raw = code || qr_payload;
    if (!raw) return next(new AppError('QR code is required', 400));

    const token = parsePayload(raw);
    if (!token) return next(new AppError('Invalid gym entry QR code', 400));

    const sub = await UserSubscription.findByQrToken(token);
    if (!sub) return next(new AppError('Subscription not found for this QR code', 404));

    if (req.ownerGymIds !== null && req.ownerGymIds.length > 0) {
      if (!req.ownerGymIds.includes(sub.gym_id)) {
        return next(new AppError('This QR code is not for one of your gyms', 403));
      }
    }

    const check = UserSubscription.isEntryAllowed(sub);
    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        allowed: false,
        message: check.reason,
        member: {
          name: `${sub.user_first_name || ''} ${sub.user_last_name || ''}`.trim(),
          email: sub.user_email,
          gym_name: sub.gym_name,
          plan_name: sub.plan_name,
          end_date: sub.end_date,
        },
      });
    }

    res.json({
      success: true,
      allowed: true,
      message: 'Entry granted',
      member: {
        user_id: sub.user_id,
        subscription_id: sub.id,
        name: `${sub.user_first_name || ''} ${sub.user_last_name || ''}`.trim(),
        email: sub.user_email,
        gym_id: sub.gym_id,
        gym_name: sub.gym_name,
        plan_name: sub.plan_name,
        end_date: sub.end_date,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  verify,
};
