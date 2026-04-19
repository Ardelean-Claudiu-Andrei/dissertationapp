const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { assignCohort } = require('../helpers/cohortAssigner');
const { evaluateFlags } = require('../helpers/flagEvaluator');
const requireAuth = require('../middleware/auth');
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

// GET /api/users/me — returns the authenticated user's profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const { password_hash, ...safe } = rows[0];
    return res.json(safe);
  } catch (err) {
    console.error('GET /api/users/me', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/me — update editable profile fields (not email)
router.put('/me', requireAuth, async (req, res) => {
  const { first_name, last_name, country, current_password, new_password } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];

    // If changing password, verify current password first
    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ error: 'current_password is required to set a new password' });
      }
      if (new_password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
      const valid = await bcrypt.compare(current_password, user.password_hash);
      if (!valid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    const newHash = new_password ? await bcrypt.hash(new_password, 10) : null;

    await pool.query(
      `UPDATE users
       SET first_name    = COALESCE(?, first_name),
           last_name     = COALESCE(?, last_name),
           country       = COALESCE(?, country),
           password_hash = COALESCE(?, password_hash),
           updated_at    = NOW()
       WHERE id = ?`,
      [
        first_name !== undefined ? first_name : null,
        last_name  !== undefined ? last_name  : null,
        country    !== undefined ? country    : null,
        newHash,
        req.userId,
      ]
    );

    const [updated] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
    const { password_hash, ...safe } = updated[0];
    return res.json(safe);
  } catch (err) {
    console.error('PUT /api/users/me', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/me/votes — all votes cast by the authenticated user
router.get('/me/votes', requireAuth, async (req, res) => {
  try {
    const [votes] = await pool.query(
      `SELECT
         v.id,
         v.poll_id,
         v.option_id,
         v.created_at,
         p.title  AS poll_title,
         p.status AS poll_status,
         o.text   AS option_text
       FROM votes v
       JOIN polls   p ON p.id = v.poll_id
       JOIN options o ON o.id = v.option_id
       WHERE v.user_id = ?
       ORDER BY v.created_at DESC`,
      [req.userId]
    );
    return res.json(votes);
  } catch (err) {
    console.error('GET /api/users/me/votes', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
