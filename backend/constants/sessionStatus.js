/**
 * Session status (booked, completed, cancelled). Update without DB migration.
 */
const SESSION_STATUS = ['booked', 'completed', 'cancelled'];

const SESSION_STATUS_SET = new Set(SESSION_STATUS);

function isValidSessionStatus(value) {
  return SESSION_STATUS_SET.has(value);
}

module.exports = { SESSION_STATUS, SESSION_STATUS_SET, isValidSessionStatus };
