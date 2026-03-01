/**
 * Centralized error handler.
 * Sends consistent JSON error responses and logs in development.
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

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
