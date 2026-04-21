const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1d';
const JWT_EXPIRATION_REMEMBER = process.env.JWT_EXPIRATION_REMEMBER || '30d';

/**
 * Sign a token with user payload for auth.
 * @param {{ id: number, email: string, role: string, role_id: number, is_active: boolean }} payload
 * @param {{ rememberMe?: boolean, expiresIn?: string | number }} [options]
 *   - rememberMe: when true, use long expiration (JWT_EXPIRATION_REMEMBER, default 30d).
 *   - expiresIn: explicit override. Takes precedence over rememberMe.
 */
function signToken(payload, options = {}) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not set');
  const expiresIn =
    options.expiresIn || (options.rememberMe ? JWT_EXPIRATION_REMEMBER : JWT_EXPIRATION);
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

module.exports = { signToken, JWT_EXPIRATION, JWT_EXPIRATION_REMEMBER };
