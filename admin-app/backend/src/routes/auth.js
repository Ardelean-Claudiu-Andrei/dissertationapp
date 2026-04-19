const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const pool = require('../db');
const { assignCohort } = require('../helpers/cohortAssigner');
const { evaluateFlags } = require('../helpers/flagEvaluator');

function signToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

// Strips sensitive fields before sending user to client
function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user account
 *     tags: [Mobile - Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, device_id]
 *             properties:
 *               email:       { type: string, format: email }
 *               password:    { type: string, minLength: 6 }
 *               first_name:  { type: string }
 *               last_name:   { type: string }
 *               device_id:   { type: string }
 *               app_version: { type: string }
 *               country:     { type: string }
 *     responses:
 *       201:
 *         description: Account created
 *       409:
 *         description: Email already registered
 */
router.post('/register', async (req, res) => {
  const { email, password, first_name, last_name, device_id, app_version, country } = req.body;

  if (!email || !password || !device_id) {
    return res.status(400).json({ error: 'email, password and device_id are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Check if email already taken
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const cohort = assignCohort(device_id);

    // Check if this device_id already has a row (anonymous user upgrading to account)
    const [existingDevice] = await pool.query('SELECT * FROM users WHERE device_id = ?', [device_id]);

    let user;
    if (existingDevice.length > 0) {
      // Upgrade existing anonymous user to a full account
      await pool.query(
        `UPDATE users
         SET email = ?, password_hash = ?, first_name = ?, last_name = ?,
             app_version = ?, country = ?, updated_at = NOW()
         WHERE device_id = ?`,
        [email, passwordHash, first_name || null, last_name || null,
         app_version || '1.0.0', country || 'RO', device_id]
      );
      const [updated] = await pool.query('SELECT * FROM users WHERE device_id = ?', [device_id]);
      user = updated[0];
    } else {
      const id = randomUUID();
      await pool.query(
        `INSERT INTO users (id, device_id, email, password_hash, first_name, last_name,
                            app_version, country, cohort, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [id, device_id, email, passwordHash, first_name || null, last_name || null,
         app_version || '1.0.0', country || 'RO', cohort]
      );
      const [created] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      user = created[0];
    }

    // Evaluate and persist feature flags
    const [flags] = await pool.query('SELECT * FROM feature_flags WHERE enabled = 1');
    const qualifyingFlags = evaluateFlags(flags, user);
    for (const flag of qualifyingFlags) {
      await pool.query(
        `INSERT IGNORE INTO flag_assignments (id, user_id, flag_id, assigned_at) VALUES (?, ?, ?, NOW())`,
        [randomUUID(), user.id, flag.id]
      );
    }

    const token = signToken(user.id);
    return res.status(201).json({ token, user: sanitizeUser(user), flags: qualifyingFlags });
  } catch (err) {
    console.error('POST /api/auth/register', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Mobile - Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:      { type: string }
 *               password:   { type: string }
 *               device_id:  { type: string }
 *               app_version:{ type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', async (req, res) => {
  const { email, password, device_id, app_version } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update device_id and app_version on login (device may have changed)
    const updates = { app_version: app_version || user.app_version };
    if (device_id && device_id !== user.device_id) {
      updates.device_id = device_id;
    }
    await pool.query(
      'UPDATE users SET device_id = ?, app_version = ?, updated_at = NOW() WHERE id = ?',
      [updates.device_id || user.device_id, updates.app_version, user.id]
    );

    const [refreshed] = await pool.query('SELECT * FROM users WHERE id = ?', [user.id]);

    // Re-evaluate flags
    const [flags] = await pool.query('SELECT * FROM feature_flags WHERE enabled = 1');
    const qualifyingFlags = evaluateFlags(flags, refreshed[0]);
    for (const flag of qualifyingFlags) {
      await pool.query(
        `INSERT IGNORE INTO flag_assignments (id, user_id, flag_id, assigned_at) VALUES (?, ?, ?, NOW())`,
        [randomUUID(), user.id, flag.id]
      );
    }

    const token = signToken(user.id);
    return res.status(200).json({ token, user: sanitizeUser(refreshed[0]), flags: qualifyingFlags });
  } catch (err) {
    console.error('POST /api/auth/login', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
