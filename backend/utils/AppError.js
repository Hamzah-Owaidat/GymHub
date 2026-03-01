/**
 * Custom error with statusCode for use with errorHandler middleware.
 */
class AppError extends Error {
  constructor(message = 'Internal Server Error', statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

module.exports = AppError;
