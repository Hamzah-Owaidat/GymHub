/**
 * Week days for coach availability. Update this file to change without DB migration.
 */
const DAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const DAY_SET = new Set(DAYS);

function isValidDay(value) {
  return DAY_SET.has(value);
}

module.exports = { DAYS, DAY_SET, isValidDay };
