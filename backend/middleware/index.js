/**
 * Central export for all middlewares.
 */
const auth = require('./auth');
const role = require('./role');
const errorHandler = require('./errorHandler');
const ownerScope = require('./ownerScope');

module.exports = {
  ...auth,
  ...role,
  ...ownerScope,
  errorHandler,
};
