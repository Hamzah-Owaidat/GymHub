/**
 * Centralized error handler.
 * Sends consistent JSON error responses and logs in development.
 *
 * Response shape:
 *   {
 *     success: false,
 *     error: "Human readable message",
 *     code: "TOKEN_EXPIRED" | "FORBIDDEN_ROLE" | ... | null,
 *     stack?: "..." // dev only
 *   }
 */
function errorHandler(err, req, res, next) {
  const statusCode = (err && (err.statusCode || err.status)) || 500;
  const message = (err && (err.message || err.error)) || 'Internal Server Error';
  const code = (err && err.code) || null;

  if (process.env.ENVIRONMENT === 'development') {
    console.error('[Error]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(process.env.ENVIRONMENT === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
