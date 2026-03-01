/**
 * Payment status. Update this file to change without DB migration.
 */
const PAYMENT_STATUS = ['pending', 'paid', 'failed'];

const PAYMENT_STATUS_SET = new Set(PAYMENT_STATUS);

function isValidPaymentStatus(value) {
  return PAYMENT_STATUS_SET.has(value);
}

module.exports = { PAYMENT_STATUS, PAYMENT_STATUS_SET, isValidPaymentStatus };
