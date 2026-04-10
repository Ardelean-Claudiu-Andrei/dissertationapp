const express = require('express');
const router = express.Router();
const pool = require('../../db');

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List all users with vote count and cohort summary
 *     tags: [Admin - Users]
 *     responses:
 *       200:
 *         description: Users list and cohort counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/User'
 *                       - type: object
 *                         properties:
 *                           vote_count:
 *                             type: integer
 *                 cohortCounts:
 *                   type: object
 *                   additionalProperties:
 *                     type: integer
 */
router.get('/', async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT
        u.id,
        u.device_id,
        u.app_version,
        u.country,
        u.cohort,
        u.created_at,
        u.updated_at,
        COUNT(v.id) AS vote_count
      FROM users u
      LEFT JOIN votes v ON v.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    const cohortCounts = users.reduce((acc, u) => {
      acc[u.cohort] = (acc[u.cohort] || 0) + 1;
      return acc;
    }, {});

    return res.json({ users, cohortCounts });
  } catch (err) {
    console.error('GET /admin/users', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
