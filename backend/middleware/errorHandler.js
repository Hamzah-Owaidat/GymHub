/**
 * Centralized error handler.
 * Sends consistent JSON error responses and logs in development.
 */
function errorHandler(err, req, res, next) {
  const statusCode = err && (err.statusCode || err.status) || 500;
  const message = err && (err.message || err.error) || 'Internal Server Error';

  if (process.env.ENVIRONMENT === 'development') {
    console.error('[Error]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.ENVIRONMENT === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
