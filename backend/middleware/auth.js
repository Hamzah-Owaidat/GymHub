const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Require valid JWT. Verifies Bearer token and attaches decoded payload to req.user.
 * Use on routes that require login.
 *
 * Errors (all 401 unless noted) include a `code`:
 *   - NO_TOKEN         – no Authorization header
 *   - TOKEN_EXPIRED    – jwt expired (JWT exp passed)
 *   - INVALID_TOKEN    – malformed / signature mismatch
 *   - SERVER_CONFIG    – JWT_SECRET missing (500)
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next(new AppError('Authentication required', 401, 'NO_TOKEN'));
  }

  if (!JWT_SECRET) {
    return next(new AppError('Server configuration error', 500, 'SERVER_CONFIG'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401, 'TOKEN_EXPIRED'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
    }
    next(err);
  }
}

/**
 * Optional auth: if a valid Bearer token is present, attach decoded payload to req.user; otherwise req.user is null.
 * Use on public routes that may behave differently when the user is logged in.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || !JWT_SECRET) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch {
    req.user = null;
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
