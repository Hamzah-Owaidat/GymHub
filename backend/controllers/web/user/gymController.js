const Gym = require('../../../models/Gym');
const SubscriptionPlan = require('../../../models/SubscriptionPlan');
const Coach = require('../../../models/Coach');
const UserSubscription = require('../../../models/UserSubscription');
const Rating = require('../../../models/Rating');
const AppError = require('../../../utils/AppError');

async function list(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;
    const search = req.query.search || undefined;

    const result = await Gym.list({ page, limit, search, is_active: true });

    const dataWithImages = await Promise.all(
      result.data.map(async (gym) => {
        const images = await Gym.getImages(gym.id);
        return { ...gym, images };
      }),
    );

    res.json({ success: true, data: dataWithImages, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid gym id', 400));

    const gym = await Gym.findById(id);
    if (!gym || !gym.is_active) {
      return next(new AppError('Gym not found', 404));
    }

    const [images, plansResult, coachesResult] = await Promise.all([
      Gym.getImages(id),
      SubscriptionPlan.list({ gym_id: id, is_active: true, page: 1, limit: 100 }),
      Coach.list({ gym_id: id, is_active: true, page: 1, limit: 100 }),
    ]);

    const plans = plansResult.data;
    const coaches = await Promise.all(
      coachesResult.data.map(async (coach) => {
        const availability = await Coach.getAvailability(coach.id);
        return { ...coach, availability };
      }),
    );

    let activeSubscription = null;
    let userRating = null;
    const userId = req.user && req.user.id;
    if (userId) {
      activeSubscription = await UserSubscription.activeForGym(userId, id);
      userRating = await Rating.findByUserAndGym(userId, id);
    }

    res.json({
      success: true,
      gym,
      images,
      plans,
      coaches,
      activeSubscription,
      userRating,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById };
