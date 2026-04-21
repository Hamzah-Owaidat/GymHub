const AppError = require('../utils/AppError');
const { ROLES, isValidRole } = require('../constants/roles');
const { isValidPermission } = require('../constants/permissions');
const { pool } = require('../config/db');

/**
 * Require the authenticated user to have one of the given roles.
 * Must be used after requireAuth (req.user must exist).
 *
 * @param {...string} allowedRoles - One or more roles, e.g. requireRole('admin'), requireRole('admin', 'owner')
 */
function requireRole(...allowedRoles) {
  const allowedSet = new Set(allowedRoles);

  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'NO_TOKEN'));
    }

    const role = req.user.role;
    if (!role || !isValidRole(role)) {
      return next(new AppError('Invalid role', 403, 'FORBIDDEN_ROLE'));
    }

    if (!allowedSet.has(role)) {
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN_ROLE'));
    }

    next();
  };
}

/**
 * Require the authenticated user to be active (is_active !== false).
 * Must be used after requireAuth. Use when login stores is_active in the token payload.
 */
function requireActive(req, res, next) {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'NO_TOKEN'));
  }

  if (req.user.is_active === false) {
    return next(new AppError('Account is deactivated', 403, 'ACCOUNT_INACTIVE'));
  }

  next();
}

/**
 * Require the authenticated user to have the given permission (by code).
 * Loads permissions from role_permissions if not already on req.user.permissions.
 * Must be used after requireAuth. req.user must have role_id (or role name used to resolve role_id).
 */
function requirePermission(permissionCode) {
  return async (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'NO_TOKEN'));
    }
    if (!isValidPermission(permissionCode)) {
      return next(new AppError('Invalid permission', 500, 'SERVER_CONFIG'));
    }
    let permissions = req.user.permissions;
    if (!Array.isArray(permissions)) {
      const roleId = req.user.role_id;
      const roleName = req.user.role;
      if (!roleId && !roleName) {
        return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN_PERMISSION'));
      }
      try {
        let rows;
        if (roleId) {
          [rows] = await pool.query(
            `SELECT p.code FROM role_permissions rp
             JOIN permissions p ON p.id = rp.permission_id AND rp.deleted_at IS NULL AND p.deleted_at IS NULL
             JOIN roles r ON r.id = rp.role_id AND r.deleted_at IS NULL
             WHERE r.id = ?`,
            [roleId]
          );
        } else {
          [rows] = await pool.query(
            `SELECT p.code FROM role_permissions rp
             JOIN permissions p ON p.id = rp.permission_id AND rp.deleted_at IS NULL AND p.deleted_at IS NULL
             JOIN roles r ON r.id = rp.role_id AND r.deleted_at IS NULL
             WHERE r.name = ?`,
            [roleName]
          );
        }
        permissions = (rows || []).map((r) => r.code);
        req.user.permissions = permissions;
      } catch (err) {
        return next(err);
      }
    }
    if (!permissions.includes(permissionCode)) {
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN_PERMISSION'));
    }
    next();
  };
}

/**
 * Convenience: require admin only.
 */
const requireAdmin = requireRole('admin');

/**
 * Convenience: require admin or owner.
 */
const requireAdminOrOwner = requireRole('admin', 'owner');

/**
 * Convenience: require admin, owner, or coach.
 */
const requireStaff = requireRole('admin', 'owner', 'coach');

module.exports = {
  requireRole,
  requirePermission,
  requireActive,
  requireAdmin,
  requireAdminOrOwner,
  requireStaff,
  ROLES,
};
