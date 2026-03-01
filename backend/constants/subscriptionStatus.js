/**
 * User subscription status. Update this file to change without DB migration.
 */
const SUBSCRIPTION_STATUS = ['active', 'expired', 'cancelled'];

const SUBSCRIPTION_STATUS_SET = new Set(SUBSCRIPTION_STATUS);

function isValidSubscriptionStatus(value) {
  return SUBSCRIPTION_STATUS_SET.has(value);
}

module.exports = {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_STATUS_SET,
  isValidSubscriptionStatus,
};
