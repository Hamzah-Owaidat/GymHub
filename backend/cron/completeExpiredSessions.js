const cron = require('node-cron');
const { pool } = require('../config/db');

let lastConnectionErrorAt = 0;

function formatCronError(err) {
  const parts = [
    err.code,
    err.sqlMessage || err.message,
  ].filter(Boolean);
  return parts.length ? parts.join(' — ') : String(err);
}

/**
 * Runs every minute. Marks sessions whose date + end_time have passed
 * (and are still 'booked') as 'completed'.
 */
function start() {
  cron.schedule('* * * * *', async () => {
    try {
      const [result] = await pool.query(
        `UPDATE sessions
         SET status = 'completed', updated_at = NOW()
         WHERE status = 'booked'
           AND deleted_at IS NULL
           AND session_date IS NOT NULL
           AND end_time IS NOT NULL
           AND TIMESTAMP(session_date, end_time) < NOW()`,
      );
      if (result.affectedRows > 0) {
        console.log(`[cron] Marked ${result.affectedRows} session(s) as completed.`);
      }
    } catch (err) {
      const now = Date.now();
      const isConnection =
        err.code === 'ECONNREFUSED' ||
        err.code === 'ENOTFOUND' ||
        err.code === 'PROTOCOL_CONNECTION_LOST' ||
        err.code === 'ER_ACCESS_DENIED_ERROR';

      if (isConnection && now - lastConnectionErrorAt < 5 * 60 * 1000) {
        return;
      }
      if (isConnection) lastConnectionErrorAt = now;

      console.error('[cron] Error completing expired sessions:', formatCronError(err));
      if (isConnection) {
        console.error(
          '[cron] Hint: start MySQL and check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in backend/.env',
        );
      }
    }
  });

  console.log('[cron] Session auto-complete job scheduled (every minute).');
}

module.exports = { start };
