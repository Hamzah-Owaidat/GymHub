const UserCard = require('../../../models/UserCard');
const AppError = require('../../../utils/AppError');

async function list(req, res, next) {
  try {
    const cards = await UserCard.listByUser(req.user.id);
    res.json({ success: true, data: cards, max: UserCard.MAX_CARDS_PER_USER });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const userId = req.user.id;
    const { card_label, card_holder, card_number, card_expiry, is_default } = req.body || {};

    if (!card_holder || !card_holder.trim()) {
      return next(new AppError('Card holder name is required', 400));
    }
    if (!card_number || card_number.replace(/\s/g, '').length < 4) {
      return next(new AppError('A valid card number is required', 400));
    }
    if (!card_expiry || !/^\d{2}\/\d{2}$/.test(card_expiry.trim())) {
      return next(new AppError('Card expiry must be in MM/YY format', 400));
    }

    const count = await UserCard.countByUser(userId);
    if (count >= UserCard.MAX_CARDS_PER_USER) {
      return next(new AppError(`You can save a maximum of ${UserCard.MAX_CARDS_PER_USER} cards. Please remove one first.`, 400));
    }

    const digits = card_number.replace(/\s/g, '');
    const last4 = digits.slice(-4);

    let brand = 'visa';
    if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) brand = 'mastercard';
    else if (/^3[47]/.test(digits)) brand = 'amex';
    else if (/^6(?:011|5)/.test(digits)) brand = 'discover';

    const makeDefault = is_default || count === 0;

    const id = await UserCard.create({
      user_id: userId,
      card_label: (card_label || '').trim() || 'My Card',
      card_holder: card_holder.trim(),
      card_last4: last4,
      card_brand: brand,
      card_expiry: card_expiry.trim(),
      is_default: makeDefault,
    });

    const card = await UserCard.findById(id, userId);
    res.status(201).json({ success: true, card });
  } catch (err) {
    next(err);
  }
}

async function setDefault(req, res, next) {
  try {
    const cardId = Number(req.params.id);
    const card = await UserCard.findById(cardId, req.user.id);
    if (!card) return next(new AppError('Card not found', 404));

    await UserCard.setDefault(cardId, req.user.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const cardId = Number(req.params.id);
    const card = await UserCard.findById(cardId, req.user.id);
    if (!card) return next(new AppError('Card not found', 404));

    await UserCard.remove(cardId, req.user.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, setDefault, remove };
