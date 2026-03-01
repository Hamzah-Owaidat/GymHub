/**
 * Central export for all middlewares.
 */
const auth = require('./auth');
const role = require('./role');
const errorHandler = require('./errorHandler');

module.exports = {
  ...auth,
  ...role,
  errorHandler,
};
