const AppError = require('../utils/AppError');

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_AUTH = 30;
const MAX_REQUESTS_GUEST = 10;

const buckets = new Map();

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of buckets.entries()) {
    if (now - entry.start > WINDOW_MS) buckets.delete(key);
  }
}

setInterval(cleanup, 5 * 60 * 1000).unref();

function aiRateLimit(req, res, next) {
  const userId = req.user && req.user.id;
  const key = userId ? `user:${userId}` : `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
  const limit = userId ? MAX_REQUESTS_AUTH : MAX_REQUESTS_GUEST;

  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry || now - entry.start > WINDOW_MS) {
    entry = { start: now, count: 0 };
    buckets.set(key, entry);
  }

  entry.count += 1;
  if (entry.count > limit) {
    return next(
      new AppError(
        'Too many AI assistant requests. Please wait a while before trying again.',
        429,
        'AI_RATE_LIMIT',
      ),
    );
  }

  return next();
}

module.exports = aiRateLimit;
