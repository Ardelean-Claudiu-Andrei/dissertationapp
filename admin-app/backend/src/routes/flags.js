const express = require('express');
const router = express.Router();
const pool = require('../db');
const { evaluateFlags } = require('../helpers/flagEvaluator');

/**
 * @swagger
 * /api/flags:
 *   get:
 *     summary: Get evaluated feature flags for a user
 *     tags: [Mobile - Flags]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the registered user
 *     responses:
 *       200:
 *         description: Qualifying flags for this user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 flags:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Flag'
 *       400:
 *         $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({ error: 'user_id query parameter is required' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [flags] = await pool.query('SELECT * FROM feature_flags WHERE enabled = 1');
    const qualifying = evaluateFlags(flags, users[0]);

    return res.json({ flags: qualifying });
  } catch (err) {
    console.error('GET /api/flags', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
