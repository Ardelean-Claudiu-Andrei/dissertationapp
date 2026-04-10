const express = require('express');
const router = express.Router();
const pool = require('../../db');

/**
 * @swagger
 * /admin/events:
 *   get:
 *     summary: List event log entries (latest 300)
 *     tags: [Admin - Events]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: event_type
 *         schema:
 *           type: string
 *         description: Filter by event type (partial match)
 *     responses:
 *       200:
 *         description: Array of event log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   user_id:
 *                     type: string
 *                     nullable: true
 *                   event_type:
 *                     type: string
 *                   payload:
 *                     type: object
 *                   created_at:
 *                     type: string
 *                     format: date-time
 */
router.get('/', async (req, res) => {
  try {
    const { user_id, event_type } = req.query;

    let sql = 'SELECT * FROM event_log WHERE 1=1';
    const params = [];

    if (user_id) {
      sql += ' AND user_id = ?';
      params.push(user_id);
    }
    if (event_type) {
      sql += ' AND event_type LIKE ?';
      params.push(`%${event_type}%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT 300';

    const [events] = await pool.query(sql, params);
    return res.json(events);
  } catch (err) {
    console.error('GET /admin/events', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
