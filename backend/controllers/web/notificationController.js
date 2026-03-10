const Notification = require('../../models/Notification');
const AppError = require('../../utils/AppError');

/**
 * List notifications for the authenticated user.
 */
async function list(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return next(new AppError('Authentication required', 401));
    }
    const userId = req.user.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await Notification.listForUser(userId, { page, limit });
    const unreadCount = await Notification.countUnread(userId);

    const data = result.data.map((n) => ({
      ...n,
      is_read: Boolean(n.is_read),
    }));

    res.json({
      success: true,
      data,
      pagination: result.pagination,
      unreadCount: Number(unreadCount),
    });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return next(new AppError('Authentication required', 401));
    }
    const userId = req.user.id;
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid notification id', 400));

    const ok = await Notification.markAsRead(userId, id);
    if (!ok) return next(new AppError('Notification not found', 404));

    const unreadCount = await Notification.countUnread(userId);
    res.json({ success: true, unreadCount: Number(unreadCount) });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return next(new AppError('Authentication required', 401));
    }
    const userId = req.user.id;
    await Notification.markAllAsRead(userId);
    const unreadCount = await Notification.countUnread(userId);
    res.json({ success: true, unreadCount: Number(unreadCount) });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  markRead,
  markAllRead,
};

