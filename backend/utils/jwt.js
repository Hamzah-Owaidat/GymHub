const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '7d';

/**
 * Sign a token with user payload for auth.
 * @param {{ id: number, email: string, role: string, role_id: number, is_active: boolean }} payload
 */
function signToken(payload) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not set');
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

module.exports = { signToken };
