const pusher = require('../config/pusher');
const Notification = require('../models/Notification');
const { isValidNotificationType } = require('../constants/notificationTypes');

const GLOBAL_CHANNEL = 'notifications-global';
const USER_CHANNEL_PREFIX = 'notifications-user-';
const EVENT_NAME = 'notification.created';

function ensureType(type) {
  const value = type || 'system';
  if (!isValidNotificationType(value)) {
    return 'system';
  }
  return value;
}

async function sendAndBroadcastToAll({ title, message, type }) {
  const safeType = ensureType(type);
  await Notification.createForAllUsers({ title, message, type: safeType });

  if (pusher) {
    await pusher.trigger(GLOBAL_CHANNEL, EVENT_NAME, {
      scope: 'all',
      title,
      message,
      type: safeType,
    });
  }
}

async function sendAndBroadcastToUser(userId, { title, message, type }) {
  const safeType = ensureType(type);
  await Notification.createForUser(userId, { title, message, type: safeType });

  if (pusher) {
    await pusher.trigger(`${USER_CHANNEL_PREFIX}${userId}`, EVENT_NAME, {
      scope: 'user',
      userId,
      title,
      message,
      type: safeType,
    });
  }
}

module.exports = {
  sendAndBroadcastToAll,
  sendAndBroadcastToUser,
};

