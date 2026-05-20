const crypto = require('crypto');

const PREFIX = 'GYMHUB_ENTRY:v1:';

function generateToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function buildPayload(token) {
  return `${PREFIX}${token}`;
}

function parsePayload(raw) {
  const code = (raw || '').toString().trim();
  if (!code.startsWith(PREFIX)) return null;
  const token = code.slice(PREFIX.length).trim();
  return token.length >= 16 ? token : null;
}

module.exports = {
  PREFIX,
  generateToken,
  buildPayload,
  parsePayload,
};
