const ContactMessage = require('../../../models/ContactMessage');
const AppError = require('../../../utils/AppError');

async function create(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    const { name, email, subject, message } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return next(new AppError('message is required', 400));
    }

    const safeName = (name && String(name).trim()) || null;
    const safeEmail = (email && String(email).trim()) || null;
    const safeSubject = (subject && String(subject).trim()) || null;

    await ContactMessage.create({
      user_id: userId || null,
      name: safeName,
      email: safeEmail,
      subject: safeSubject,
      message: message.trim(),
    });

    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
};

