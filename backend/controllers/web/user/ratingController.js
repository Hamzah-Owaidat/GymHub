const Rating = require('../../../models/Rating');
const Gym = require('../../../models/Gym');
const AppError = require('../../../utils/AppError');

async function getMyRating(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return next(new AppError('Authentication required', 401));

    const gymId = Number(req.params.gymId);
    if (!gymId) return next(new AppError('Invalid gym id', 400));

    const rating = await Rating.findByUserAndGym(userId, gymId);
    res.json({ success: true, rating });
  } catch (err) {
    next(err);
  }
}

async function rate(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return next(new AppError('Authentication required', 401));

    const gymId = Number(req.params.gymId);
    if (!gymId) return next(new AppError('Invalid gym id', 400));

    const gym = await Gym.findById(gymId);
    if (!gym || !gym.is_active) return next(new AppError('Gym not found', 404));

    const { rating, comment } = req.body || {};
    const ratingNum = Number(rating);

    if (!ratingNum || ratingNum < 0.5 || ratingNum > 5) {
      return next(new AppError('Rating must be between 0.5 and 5', 400));
    }

    const rounded = Math.round(ratingNum * 2) / 2;

    await Rating.upsert({
      user_id: userId,
      gym_id: gymId,
      rating: rounded,
      comment: comment ? String(comment).trim() : null,
    });

    const updatedGym = await Gym.findById(gymId);
    res.json({
      success: true,
      rating_average: updatedGym.rating_average,
      rating_count: updatedGym.rating_count,
    });
  } catch (err) {
    next(err);
  }
}

async function listForGym(req, res, next) {
  try {
    const gymId = Number(req.params.gymId);
    if (!gymId) return next(new AppError('Invalid gym id', 400));

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await Rating.listByGym(gymId, { page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyRating, rate, listForGym };
