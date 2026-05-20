const RECOMMENDATIONS_MARKER = '---RECOMMENDATIONS---';

/**
 * Remove internal ids, refs, and JSON blocks from text shown to end users.
 */
function sanitizeReplyForClient(text) {
  let out = String(text || '');

  const markerIdx = out.lastIndexOf(RECOMMENDATIONS_MARKER);
  if (markerIdx !== -1) {
    out = out.slice(0, markerIdx);
  }

  out = out
    .replace(/\{[\s\S]*"gym_id"[\s\S]*\}/gi, '')
    .replace(/\{[\s\S]*"gym_ref"[\s\S]*\}/gi, '')
    .replace(/---RECOMMENDATIONS---[\s\S]*/gi, '')
    .replace(/\b(gym|plan|coach)_id\s*=\s*\d+/gi, '')
    .replace(/\b(gym|plan|coach)_id\s*:\s*\d+/gi, '')
    .replace(/\(\s*(gym|plan|coach)_id\s*[=:]\s*\d+\s*\)/gi, '')
    .replace(/,?\s*\b(gym|plan|coach)_id\s*[=:]\s*\d+/gi, '')
    .replace(/\b(G|P|C)\d+(?:-\d+)?\b/g, '')
    .replace(/,\s*,/g, ',')
    .replace(/,\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return out;
}

module.exports = { sanitizeReplyForClient, RECOMMENDATIONS_MARKER };
