/**
 * User roles. Update this file to add/change roles without DB migration.
 */
const ROLES = ['admin', 'owner', 'coach', 'user'];

const ROLE_SET = new Set(ROLES);

function isValidRole(value) {
  return ROLE_SET.has(value);
}

module.exports = { ROLES, ROLE_SET, isValidRole };
