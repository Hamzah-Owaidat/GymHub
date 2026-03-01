/**
 * Permission codes (must match permissions.code in DB).
 * Use for requirePermission('permissions:code') and validation.
 */
const PERMISSIONS = [
  'users:create', 'users:read', 'users:update', 'users:delete', 'users:list',
  'gyms:create', 'gyms:read', 'gyms:update', 'gyms:delete', 'gyms:list',
  'coaches:create', 'coaches:read', 'coaches:update', 'coaches:delete', 'coaches:list',
  'coach_availability:manage',
  'subscription_plans:create', 'subscription_plans:read', 'subscription_plans:update', 'subscription_plans:delete', 'subscription_plans:list',
  'user_subscriptions:create', 'user_subscriptions:read', 'user_subscriptions:list',
  'sessions:create', 'sessions:read', 'sessions:update', 'sessions:delete', 'sessions:list',
  'ratings:create', 'ratings:read', 'ratings:delete', 'ratings:list',
  'notifications:read', 'notifications:update', 'notifications:list',
  'payments:create', 'payments:read', 'payments:list',
];

const PERMISSION_SET = new Set(PERMISSIONS);

function isValidPermission(code) {
  return PERMISSION_SET.has(code);
}

module.exports = { PERMISSIONS, PERMISSION_SET, isValidPermission };
