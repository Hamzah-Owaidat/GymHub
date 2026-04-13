/**
 * Notification types. Update this file to change without DB migration.
 */
const NOTIFICATION_TYPES = ['session', 'subscription', 'system', 'chat'];

const NOTIFICATION_TYPES_SET = new Set(NOTIFICATION_TYPES);

function isValidNotificationType(value) {
  return NOTIFICATION_TYPES_SET.has(value);
}

module.exports = {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPES_SET,
  isValidNotificationType,
};
