const { pool } = require('../../../config/db');

function gymScope(alias, gymIds) {
  if (!gymIds) return { sql: '', params: [] };
  if (!gymIds.length) return { sql: `AND ${alias}.id = 0`, params: [] };
  return {
    sql: `AND ${alias}.id IN (${gymIds.map(() => '?').join(',')})`,
    params: [...gymIds],
  };
}

function fkScope(col, gymIds) {
  if (!gymIds) return { sql: '', params: [] };
  if (!gymIds.length) return { sql: `AND ${col} = 0`, params: [] };
  return {
    sql: `AND ${col} IN (${gymIds.map(() => '?').join(',')})`,
    params: [...gymIds],
  };
}

async function overview(req, res, next) {
  try {
    const gids = req.ownerGymIds || null;
    const isOwner = !!gids;

    const gs = gymScope('g', gids);
    const fkGym = (col) => fkScope(col, gids);

    const [
      [gymsRow],
      [coachesRow],
      [sessionsRow],
      [paymentsRow],
      [plansRow],
      [revenueRow],
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM gyms g WHERE g.deleted_at IS NULL ${gs.sql}`, gs.params),
      pool.query(`SELECT COUNT(*) AS total FROM coaches WHERE deleted_at IS NULL AND is_active = 1 ${fkGym('gym_id').sql}`, fkGym('gym_id').params),
      pool.query(`SELECT COUNT(*) AS total FROM sessions WHERE deleted_at IS NULL ${fkGym('gym_id').sql}`, fkGym('gym_id').params),
      pool.query(`SELECT COUNT(*) AS total FROM payments WHERE deleted_at IS NULL ${fkGym('gym_id').sql}`, fkGym('gym_id').params),
      pool.query(`SELECT COUNT(*) AS total FROM subscription_plans WHERE deleted_at IS NULL ${fkGym('gym_id').sql}`, fkGym('gym_id').params),
      pool.query(
        `SELECT COALESCE(SUM(
          CASE
            WHEN p.session_id IS NOT NULL THEN s.price * COALESCE(c.gym_share_percentage, 0) / 100
            ELSE p.amount
          END
        ), 0) AS total
        FROM payments p
        LEFT JOIN sessions s ON s.id = p.session_id
        LEFT JOIN coaches c ON c.id = s.coach_id
        WHERE p.deleted_at IS NULL AND p.status = 'paid' ${fkGym('p.gym_id').sql}`,
        fkGym('p.gym_id').params,
      ),
    ]);

    const metrics = {
      totalGyms: Number(gymsRow[0].total),
      activeCoaches: Number(coachesRow[0].total),
      totalSessions: Number(sessionsRow[0].total),
      totalPayments: Number(paymentsRow[0].total),
      totalPlans: Number(plansRow[0].total),
      totalRevenue: Number(revenueRow[0].total),
    };

    if (!isOwner) {
      const [[usersRow], [activeUsersRow]] = await Promise.all([
        pool.query('SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL'),
        pool.query('SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL AND is_active = 1'),
      ]);
      metrics.totalUsers = Number(usersRow[0].total);
      metrics.activeUsers = Number(activeUsersRow[0].total);
    }

    const fk = fkGym('gym_id');

    const [revenueByMonth] = await pool.query(`
      SELECT DATE_FORMAT(p.created_at, '%Y-%m') AS month,
        SUM(
          CASE
            WHEN p.session_id IS NOT NULL THEN s.price * COALESCE(c.gym_share_percentage, 0) / 100
            ELSE p.amount
          END
        ) AS revenue,
        COUNT(*) AS count
      FROM payments p
      LEFT JOIN sessions s ON s.id = p.session_id
      LEFT JOIN coaches c ON c.id = s.coach_id
      WHERE p.deleted_at IS NULL AND p.status = 'paid'
        AND p.created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) ${fk.sql.replace(/gym_id/g, 'p.gym_id')}
      GROUP BY month ORDER BY month ASC
    `, fk.params);

    const [sessionsByMonth] = await pool.query(`
      SELECT DATE_FORMAT(session_date, '%Y-%m') AS month, COUNT(*) AS count
      FROM sessions
      WHERE deleted_at IS NULL AND session_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) ${fk.sql}
      GROUP BY month ORDER BY month ASC
    `, fk.params);

    const [sessionsByStatus] = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM sessions
      WHERE deleted_at IS NULL ${fk.sql}
      GROUP BY status
    `, fk.params);

    const [paymentsByMethod] = await pool.query(`
      SELECT COALESCE(method, 'unknown') AS method, COUNT(*) AS count
      FROM payments
      WHERE deleted_at IS NULL ${fk.sql}
      GROUP BY method
    `, fk.params);

    const [topGyms] = await pool.query(`
      SELECT g.name, COUNT(s.id) AS session_count,
             COALESCE(SUM(p2.revenue), 0) AS revenue
      FROM gyms g
      LEFT JOIN sessions s ON s.gym_id = g.id AND s.deleted_at IS NULL
      LEFT JOIN (
        SELECT p.gym_id,
          SUM(
            CASE
              WHEN p.session_id IS NOT NULL THEN s.price * COALESCE(c.gym_share_percentage, 0) / 100
              ELSE p.amount
            END
          ) AS revenue
        FROM payments p
        LEFT JOIN sessions s ON s.id = p.session_id
        LEFT JOIN coaches c ON c.id = s.coach_id
        WHERE p.deleted_at IS NULL AND p.status = 'paid'
        GROUP BY gym_id
      ) p2 ON p2.gym_id = g.id
      WHERE g.deleted_at IS NULL ${gs.sql}
      GROUP BY g.id, g.name
      ORDER BY session_count DESC LIMIT 5
    `, gs.params);

    const [recentPayments] = await pool.query(`
      SELECT p.id, p.amount, p.method, p.status, p.created_at,
        u.first_name AS user_first_name, u.last_name AS user_last_name,
        g.name AS gym_name
      FROM payments p
      JOIN users u ON u.id = p.user_id
      JOIN gyms g ON g.id = p.gym_id
      WHERE p.deleted_at IS NULL ${fk.sql.replace(/gym_id/g, 'p.gym_id')}
      ORDER BY p.created_at DESC LIMIT 8
    `, fk.params);

    const [recentSessions] = await pool.query(`
      SELECT s.id, s.session_date, s.start_time, s.end_time, s.status, s.price,
        u.first_name AS user_first_name, u.last_name AS user_last_name,
        g.name AS gym_name
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      JOIN gyms g ON g.id = s.gym_id
      WHERE s.deleted_at IS NULL ${fk.sql.replace(/gym_id/g, 's.gym_id')}
      ORDER BY s.created_at DESC LIMIT 8
    `, fk.params);

    const charts = {
      revenueByMonth: revenueByMonth.map((r) => ({ month: r.month, revenue: Number(r.revenue), count: Number(r.count) })),
      sessionsByMonth: sessionsByMonth.map((r) => ({ month: r.month, count: Number(r.count) })),
      sessionsByStatus: sessionsByStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      paymentsByMethod: paymentsByMethod.map((r) => ({ method: r.method, count: Number(r.count) })),
      topGyms: topGyms.map((r) => ({ name: r.name, sessionCount: Number(r.session_count), revenue: Number(r.revenue) })),
    };

    if (!isOwner) {
      const [userGrowth] = await pool.query(`
        SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
        FROM users WHERE deleted_at IS NULL AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY month ORDER BY month ASC
      `);
      charts.userGrowth = userGrowth.map((r) => ({ month: r.month, count: Number(r.count) }));
    }

    res.json({
      success: true,
      metrics,
      charts,
      tables: {
        recentPayments: recentPayments.map((r) => ({ ...r, amount: Number(r.amount) })),
        recentSessions,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function coachOverview(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const [coachRows] = await pool.query(
      `
        SELECT c.id, c.gym_id, c.gym_share_percentage, c.price_per_session,
               g.name AS gym_name,
               u.first_name AS coach_first_name,
               u.last_name AS coach_last_name
        FROM coaches c
        JOIN gyms g ON g.id = c.gym_id AND g.deleted_at IS NULL
        JOIN users u ON u.id = c.user_id
        WHERE c.user_id = ? AND c.deleted_at IS NULL AND c.is_active = 1
        ORDER BY c.id DESC
        LIMIT 1
      `,
      [userId],
    );
    const coach = coachRows[0];
    if (!coach) return res.status(404).json({ success: false, error: 'Coach profile not found' });

    const coachId = Number(coach.id);
    const [metricRows] = await pool.query(
      `
        SELECT
          COUNT(*) AS total_sessions,
          SUM(CASE WHEN s.session_date >= CURDATE() AND s.status = 'booked' THEN 1 ELSE 0 END) AS upcoming_sessions,
          SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) AS completed_sessions,
          COALESCE(SUM(
            CASE
              WHEN s.status IN ('booked', 'completed') THEN
                COALESCE(s.price, 0) * (1 - COALESCE(c.gym_share_percentage, 0) / 100)
              ELSE 0
            END
          ), 0) AS total_earnings
        FROM sessions s
        JOIN coaches c ON c.id = s.coach_id
        WHERE s.deleted_at IS NULL
          AND s.coach_id = ?
      `,
      [coachId],
    );
    const metrics = {
      totalSessions: Number(metricRows[0].total_sessions || 0),
      upcomingSessions: Number(metricRows[0].upcoming_sessions || 0),
      completedSessions: Number(metricRows[0].completed_sessions || 0),
      totalEarnings: Number(metricRows[0].total_earnings || 0),
    };

    const [sessionsByMonth] = await pool.query(
      `
        SELECT DATE_FORMAT(s.session_date, '%Y-%m') AS month, COUNT(*) AS count
        FROM sessions s
        WHERE s.deleted_at IS NULL
          AND s.coach_id = ?
          AND s.session_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY month
        ORDER BY month ASC
      `,
      [coachId],
    );

    const [sessionsByStatus] = await pool.query(
      `
        SELECT s.status, COUNT(*) AS count
        FROM sessions s
        WHERE s.deleted_at IS NULL
          AND s.coach_id = ?
        GROUP BY s.status
      `,
      [coachId],
    );

    res.json({
      success: true,
      coach: {
        id: coachId,
        gym_id: Number(coach.gym_id),
        gym_name: coach.gym_name,
        first_name: coach.coach_first_name,
        last_name: coach.coach_last_name,
      },
      metrics,
      charts: {
        sessionsByMonth: sessionsByMonth.map((r) => ({ month: r.month, count: Number(r.count) })),
        sessionsByStatus: sessionsByStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { overview, coachOverview };
