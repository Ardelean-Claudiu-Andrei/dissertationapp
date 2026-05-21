const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const pool = require('../db');
const { assignCohort, getVersionConfig } = require('../helpers/cohortAssigner');
const { evaluateFlags } = require('../helpers/flagEvaluator');

function signToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

// Strips sensitive fields and adds version config before sending user to client
function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  const vc = getVersionConfig(safe.cohort);
  return {
    ...safe,
    assigned_version: vc.version,
    version_config: { version: vc.version, label: vc.label, theme: vc.theme, features: vc.features },
  };
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
  const requestedAppVersion = app_version || req.appVersion || '1.0.0';

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

    // Check if this device_id already has an anonymous row (no email) to upgrade
    const [existingDevice] = await pool.query('SELECT * FROM users WHERE device_id = ?', [device_id]);

    let user;
    if (existingDevice.length > 0 && !existingDevice[0].email) {
      // Anonymous device row — upgrade it to a full account.
      // Keep the existing cohort (already persisted, based on the row's id).
      await pool.query(
        `UPDATE users
         SET email = ?, password_hash = ?, first_name = ?, last_name = ?,
             app_version = ?, country = ?, updated_at = NOW()
         WHERE device_id = ?`,
        [email, passwordHash, first_name || null, last_name || null,
         requestedAppVersion, country || 'RO', device_id]
      );
      const [updated] = await pool.query('SELECT * FROM users WHERE device_id = ?', [device_id]);
      user = updated[0];
    } else {
      // New user — generate UUID first, derive cohort from it
      const id = randomUUID();
      const cohort = assignCohort(id);
      // If the device_id is already claimed by another registered account, give this
      // new row a synthetic device_id so the unique constraint doesn't block registration.
      // Cohort is user-based (UUID), so this doesn't affect version assignment.
      const effectiveDeviceId = existingDevice.length > 0 ? `virtual_${id}` : device_id;
      await pool.query(
        `INSERT INTO users (id, device_id, email, password_hash, first_name, last_name,
                            app_version, country, cohort, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [id, effectiveDeviceId, email, passwordHash, first_name || null, last_name || null,
         requestedAppVersion, country || 'RO', cohort]
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
  const { email, password, device_id } = req.body;

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
    console.log(`[login] ${email} | x-app-version: ${req.appVersion} | db app_version: ${user.app_version} | cohort: ${user.cohort}`);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // On login, only claim the device_id if it isn't already owned by another account.
    // app_version is intentionally NOT updated here — login is an auth event, not a
    // device-registration event. app_version is updated by POST /api/users/register
    // which runs on every app launch with the current x-app-version header.
    let newDeviceId = user.device_id;
    if (device_id && device_id !== user.device_id) {
      const [takenBy] = await pool.query(
        'SELECT id FROM users WHERE device_id = ? AND id != ?',
        [device_id, user.id]
      );
      if (takenBy.length === 0) newDeviceId = device_id;
    }
    if (newDeviceId !== user.device_id) {
      await pool.query(
        'UPDATE users SET device_id = ?, updated_at = NOW() WHERE id = ?',
        [newDeviceId, user.id]
      );
    }

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
