const express = require('express');
const router = express.Router();
const pool = require('../../db');
const { randomUUID } = require('crypto');

/**
 * @swagger
 * /admin/flags:
 *   get:
 *     summary: List all feature flags with assignment counts
 *     tags: [Admin - Flags]
 *     responses:
 *       200:
 *         description: Array of flags
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Flag'
 *                   - type: object
 *                     properties:
 *                       assignment_count:
 *                         type: integer
 */
router.get('/', async (req, res) => {
  try {
    const [flags] = await pool.query(`
      SELECT f.*, COUNT(fa.id) AS assignment_count
      FROM feature_flags f
      LEFT JOIN flag_assignments fa ON fa.flag_id = f.id
      GROUP BY f.id
      ORDER BY f.created_at DESC
    `);
    return res.json(flags);
  } catch (err) {
    console.error('GET /admin/flags', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /admin/flags:
 *   post:
 *     summary: Create a feature flag
 *     tags: [Admin - Flags]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *                 default: true
 *               rollout_pct:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 100
 *               min_version:
 *                 type: string
 *                 default: "1.0.0"
 *     responses:
 *       201:
 *         description: Created flag
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Flag'
 *       409:
 *         description: Flag name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req, res) => {
  const { name, description, enabled, rollout_pct, min_version } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO feature_flags (id, name, description, enabled, rollout_pct, min_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id,
        name,
        description || null,
        enabled !== undefined ? (enabled ? 1 : 0) : 1,
        rollout_pct !== undefined ? rollout_pct : 100,
        min_version || '1.0.0',
      ]
    );

    const [created] = await pool.query('SELECT * FROM feature_flags WHERE id = ?', [id]);
    return res.status(201).json(created[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A flag with this name already exists' });
    }
    console.error('POST /admin/flags', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /admin/flags/{id}:
 *   put:
 *     summary: Update a feature flag
 *     tags: [Admin - Flags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *               rollout_pct:
 *                 type: integer
 *               min_version:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated flag
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Flag'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.put('/:id', async (req, res) => {
  const { name, description, enabled, rollout_pct, min_version } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE feature_flags
       SET name        = COALESCE(?, name),
           description = COALESCE(?, description),
           enabled     = COALESCE(?, enabled),
           rollout_pct = COALESCE(?, rollout_pct),
           min_version = COALESCE(?, min_version),
           updated_at  = NOW()
       WHERE id = ?`,
      [
        name || null,
        description || null,
        enabled !== undefined ? (enabled ? 1 : 0) : null,
        rollout_pct !== undefined ? rollout_pct : null,
        min_version || null,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Flag not found' });
    }

    const [updated] = await pool.query('SELECT * FROM feature_flags WHERE id = ?', [req.params.id]);
    return res.json(updated[0]);
  } catch (err) {
    console.error('PUT /admin/flags/:id', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /admin/flags/{id}:
 *   delete:
 *     summary: Delete a feature flag
 *     tags: [Admin - Flags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM feature_flags WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Flag not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('DELETE /admin/flags/:id', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
