/**
 * Custom error with statusCode and machine-readable code for use with errorHandler middleware.
 *
 * Common codes:
 *  - NO_TOKEN                – no Authorization header / bearer token provided
 *  - TOKEN_EXPIRED           – JWT expired
 *  - INVALID_TOKEN           – JWT malformed or signature mismatch
 *  - SERVER_CONFIG           – misconfigured server (e.g. missing JWT_SECRET)
 *  - ACCOUNT_INACTIVE        – user account deactivated
 *  - INVALID_CREDENTIALS     – wrong email / password
 *  - FORBIDDEN_ROLE          – user role not allowed for this resource
 *  - FORBIDDEN_PERMISSION    – user missing required permission
 *  - NOT_FOUND
 *  - VALIDATION_ERROR
 */
class AppError extends Error {
  constructor(message = 'Internal Server Error', statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

module.exports = AppError;
