const express = require('express');
const router = express.Router();
const pool = require('../db');
const { assignCohort } = require('../helpers/cohortAssigner');
const { evaluateFlags } = require('../helpers/flagEvaluator');
const { randomUUID } = require('crypto');

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register or update a device (called on every app launch)
 *     tags: [Mobile - Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [device_id]
 *             properties:
 *               device_id:
 *                 type: string
 *               app_version:
 *                 type: string
 *                 default: "1.0.0"
 *               country:
 *                 type: string
 *                 default: "RO"
 *     responses:
 *       200:
 *         description: User info and evaluated flags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 flags:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Flag'
 *       400:
 *         $ref: '#/components/schemas/Error'
 */
router.post('/register', async (req, res) => {
  try {
    const deviceId = req.body.device_id || req.deviceId;
    const appVersion = req.body.app_version || req.appVersion || '1.0.0';
    const country = req.body.country || 'RO';

    if (!deviceId) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    // Check if user already exists
    const [existing] = await pool.query(
      'SELECT * FROM users WHERE device_id = ?',
      [deviceId]
    );

    let user;

    if (existing.length > 0) {
      // Update app_version on every launch so flags re-evaluate correctly
      await pool.query(
        'UPDATE users SET app_version = ?, updated_at = NOW() WHERE device_id = ?',
        [appVersion, deviceId]
      );
      user = { ...existing[0], app_version: appVersion };
    } else {
      const id = randomUUID();
      const cohort = assignCohort(deviceId);
      await pool.query(
        'INSERT INTO users (id, device_id, app_version, country, cohort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [id, deviceId, appVersion, country, cohort]
      );
      user = { id, device_id: deviceId, app_version: appVersion, country, cohort };
    }

    // Evaluate feature flags for this user
    const [flags] = await pool.query(
      'SELECT * FROM feature_flags WHERE enabled = 1'
    );
    const qualifyingFlags = evaluateFlags(flags, user);

    // Persist new flag assignments (skip already-assigned ones)
    for (const flag of qualifyingFlags) {
      const assignmentId = randomUUID();
      await pool.query(
        `INSERT IGNORE INTO flag_assignments (id, user_id, flag_id, assigned_at)
         VALUES (?, ?, ?, NOW())`,
        [assignmentId, user.id, flag.id]
      );
    }

    return res.status(200).json({ user, flags: qualifyingFlags });
  } catch (err) {
    console.error('POST /api/users/register', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
