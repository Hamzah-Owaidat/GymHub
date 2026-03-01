/**
 * Central export for all enum-like constants.
 * Use these in code instead of DB ENUMs so values can change without migrations.
 */
module.exports = {
  ...require('./roles'),
  ...require('./days'),
  ...require('./subscriptionStatus'),
  ...require('./sessionStatus'),
  ...require('./notificationTypes'),
  ...require('./paymentStatus'),
};
