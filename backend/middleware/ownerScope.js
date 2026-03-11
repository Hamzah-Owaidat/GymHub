const { pool } = require('../config/db');

/**
 * Middleware that attaches the owner's gym IDs to the request.
 * - Admin: req.ownerGymIds = null (no filter, sees everything)
 * - Owner: req.ownerGymIds = [1, 5, 12, ...] (only their own gyms)
 * Must be used after requireAuth.
 */
async function attachOwnerGyms(req, res, next) {
  try {
    if (!req.user) {
      req.ownerGymIds = null;
      return next();
    }

    if (req.user.role === 'admin') {
      req.ownerGymIds = null;
      return next();
    }

    if (req.user.role === 'owner') {
      const [rows] = await pool.query(
        'SELECT id FROM gyms WHERE owner_id = ? AND deleted_at IS NULL',
        [req.user.id],
      );
      req.ownerGymIds = rows.map((r) => r.id);
      return next();
    }

    req.ownerGymIds = [];
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { attachOwnerGyms };
