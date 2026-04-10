const express = require('express');
const router = express.Router();
const pool = require('../../db');
const { randomUUID } = require('crypto');

/**
 * @swagger
 * /admin/polls:
 *   get:
 *     summary: List all polls with their options
 *     tags: [Admin - Polls]
 *     responses:
 *       200:
 *         description: Array of polls
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Poll'
 *       500:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  try {
    const [polls] = await pool.query(
      'SELECT * FROM polls ORDER BY created_at DESC'
    );

    const pollIds = polls.map((p) => p.id);
    let options = [];
    if (pollIds.length > 0) {
      [options] = await pool.query(
        'SELECT * FROM options WHERE poll_id IN (?) ORDER BY created_at ASC',
        [pollIds]
      );
    }

    const result = polls.map((poll) => ({
      ...poll,
      options: options.filter((o) => o.poll_id === poll.id),
    }));

    return res.json(result);
  } catch (err) {
    console.error('GET /admin/polls', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /admin/polls:
 *   post:
 *     summary: Create a poll with options (transaction)
 *     tags: [Admin - Polls]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, options]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, active, closed]
 *                 default: draft
 *               options:
 *                 type: array
 *                 minItems: 2
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Created poll
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Poll'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/schemas/Error'
 */
router.post('/', async (req, res) => {
  const { title, description, status, options } = req.body;

  if (!title || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'title and at least 2 options are required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const pollId = randomUUID();
    await conn.query(
      'INSERT INTO polls (id, title, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [pollId, title, description || null, status || 'draft']
    );

    for (const text of options) {
      const optId = randomUUID();
      await conn.query(
        'INSERT INTO options (id, poll_id, text, vote_count, created_at) VALUES (?, ?, ?, 0, NOW())',
        [optId, pollId, text]
      );
    }

    await conn.commit();

    const [created] = await conn.query('SELECT * FROM polls WHERE id = ?', [pollId]);
    const [createdOptions] = await conn.query(
      'SELECT * FROM options WHERE poll_id = ?',
      [pollId]
    );

    return res.status(201).json({ ...created[0], options: createdOptions });
  } catch (err) {
    await conn.rollback();
    console.error('POST /admin/polls', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
});

/**
 * @swagger
 * /admin/polls/{id}:
 *   put:
 *     summary: Update poll title, description, or status
 *     tags: [Admin - Polls]
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, active, closed]
 *     responses:
 *       200:
 *         description: Updated poll
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Poll'
 *       404:
 *         description: Poll not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', async (req, res) => {
  const { title, description, status } = req.body;

  try {
    const [result] = await pool.query(
      'UPDATE polls SET title = COALESCE(?, title), description = COALESCE(?, description), status = COALESCE(?, status), updated_at = NOW() WHERE id = ?',
      [title || null, description || null, status || null, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const [updated] = await pool.query('SELECT * FROM polls WHERE id = ?', [req.params.id]);
    return res.json(updated[0]);
  } catch (err) {
    console.error('PUT /admin/polls/:id', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /admin/polls/{id}:
 *   delete:
 *     summary: Delete a poll (cascades to options and votes)
 *     tags: [Admin - Polls]
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
 *         description: Poll not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM polls WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('DELETE /admin/polls/:id', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
