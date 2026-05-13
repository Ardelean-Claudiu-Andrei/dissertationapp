const express = require('express');
const router = express.Router();
const pool = require('../../db');
const { getCacheStats } = require('../../cache');

/**
 * @swagger
 * /admin/scalability/stats:
 *   get:
 *     summary: Scalability and performance stats (cache state, DB connectivity, counters)
 *     tags: [Admin - Scalability]
 *     responses:
 *       200:
 *         description: Current runtime stats useful for the scalability demo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cache:
 *                   type: object
 *                   properties:
 *                     size:    { type: integer, description: Number of poll results currently in the in-memory cache }
 *                     keys:    { type: array, items: { type: string }, description: Poll IDs that are cached right now }
 *                     ttl_ms:  { type: integer, description: Cache TTL in milliseconds }
 *                 uptime_seconds:
 *                   type: number
 *                   description: Process uptime in seconds (rounded to 1 decimal)
 *                 db:
 *                   type: object
 *                   properties:
 *                     connected: { type: boolean }
 *                 event_log_count:
 *                   type: integer
 *                   description: Total rows in the event_log table
 *                 votes_total:
 *                   type: integer
 *                   description: Total votes cast across all polls
 *                 users_total:
 *                   type: integer
 *                   description: Total registered users
 */
router.get('/stats', async (req, res) => {
  let db_connected = false;
  let event_log_count = 0;
  let votes_total = 0;
  let users_total = 0;

  try {
    await pool.query('SELECT 1');
    db_connected = true;

    const [[el]] = await pool.query('SELECT COUNT(*) AS cnt FROM event_log');
    const [[vt]] = await pool.query('SELECT COUNT(*) AS cnt FROM votes');
    const [[ut]] = await pool.query('SELECT COUNT(*) AS cnt FROM users');

    event_log_count = Number(el.cnt);
    votes_total     = Number(vt.cnt);
    users_total     = Number(ut.cnt);
  } catch (err) {
    console.error('GET /admin/scalability/stats', err);
    // Return what we have even if DB is down
  }

  return res.json({
    cache: getCacheStats(),
    uptime_seconds: Math.round(process.uptime() * 10) / 10,
    db: { connected: db_connected },
    event_log_count,
    votes_total,
    users_total,
  });
});

module.exports = router;
