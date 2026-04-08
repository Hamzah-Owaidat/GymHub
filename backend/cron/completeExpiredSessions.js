const cron = require('node-cron');
const { pool } = require('../config/db');

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
           AND CONCAT(session_date, ' ', end_time) < NOW()`,
      );
      if (result.affectedRows > 0) {
        console.log(`[cron] Marked ${result.affectedRows} session(s) as completed.`);
      }
    } catch (err) {
      console.error('[cron] Error completing expired sessions:', err.message);
    }
  });

  console.log('[cron] Session auto-complete job scheduled (every minute).');
}

module.exports = { start };
