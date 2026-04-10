const express = require('express');
const router = express.Router();
const pool = require('../db');
const { getCache, setCache, invalidateCache } = require('../cache');
const { randomUUID } = require('crypto');

/**
 * @swagger
 * /api/polls:
 *   get:
 *     summary: List all active polls
 *     tags: [Mobile - Polls]
 *     responses:
 *       200:
 *         description: Array of active polls
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Poll'
 */
router.get('/', async (req, res) => {
  try {
    const [polls] = await pool.query(
      'SELECT * FROM polls WHERE status = ? ORDER BY created_at DESC',
      ['active']
    );
    return res.json(polls);
  } catch (err) {
    console.error('GET /api/polls', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/polls/{id}:
 *   get:
 *     summary: Get a single poll with its options
 *     tags: [Mobile - Polls]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Poll with options
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 poll:
 *                   $ref: '#/components/schemas/Poll'
 *                 options:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Option'
 *       404:
 *         $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req, res) => {
  try {
    const [polls] = await pool.query('SELECT * FROM polls WHERE id = ?', [req.params.id]);
    if (polls.length === 0) return res.status(404).json({ error: 'Poll not found' });

    const [options] = await pool.query(
      'SELECT * FROM options WHERE poll_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );

    return res.json({ poll: polls[0], options });
  } catch (err) {
    console.error('GET /api/polls/:id', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/polls/{id}/vote:
 *   post:
 *     summary: Submit a vote on a poll
 *     tags: [Mobile - Polls]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [option_id, user_id]
 *             properties:
 *               option_id:
 *                 type: string
 *               user_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vote recorded
 *       409:
 *         description: Already voted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/vote', async (req, res) => {
  const { option_id, user_id } = req.body;
  const pollId = req.params.id;

  if (!option_id || !user_id) {
    return res.status(400).json({ error: 'option_id and user_id are required' });
  }

  const [existing] = await pool.query(
    'SELECT id FROM votes WHERE user_id = ? AND poll_id = ?',
    [user_id, pollId]
  );
  if (existing.length > 0) {
    return res.status(409).json({ error: 'Already voted on this poll' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const voteId = randomUUID();
    await conn.query(
      'INSERT INTO votes (id, poll_id, option_id, user_id, created_at) VALUES (?, ?, ?, ?, NOW())',
      [voteId, pollId, option_id, user_id]
    );

    await conn.query(
      'UPDATE options SET vote_count = vote_count + 1 WHERE id = ? AND poll_id = ?',
      [option_id, pollId]
    );

    await conn.commit();

    invalidateCache(pollId);

    return res.status(201).json({ message: 'Vote recorded' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Already voted on this poll' });
    }
    console.error('POST /api/polls/:id/vote', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
});

/**
 * @swagger
 * /api/polls/{id}/results:
 *   get:
 *     summary: Get vote counts per option (cached by default)
 *     tags: [Mobile - Polls]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: cached
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Set to false to force a DB read
 *     responses:
 *       200:
 *         description: Vote results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pollId:
 *                   type: string
 *                 counts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       option_id:
 *                         type: string
 *                       text:
 *                         type: string
 *                       vote_count:
 *                         type: integer
 *                 fromCache:
 *                   type: boolean
 *                 cachedAt:
 *                   type: string
 *                   nullable: true
 */
router.get('/:id/results', async (req, res) => {
  const pollId = req.params.id;
  const useCache = req.query.cached !== 'false';

  if (useCache) {
    const cached = getCache(pollId);
    if (cached) {
      return res.json({
        pollId,
        counts: cached.counts,
        fromCache: true,
        cachedAt: cached.cachedAt,
      });
    }
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, text, vote_count FROM options WHERE poll_id = ? ORDER BY vote_count DESC',
      [pollId]
    );

    const counts = rows.map((r) => ({
      option_id: r.id,
      text: r.text,
      vote_count: r.vote_count,
    }));

    if (useCache) {
      setCache(pollId, counts);
    }

    return res.json({ pollId, counts, fromCache: false, cachedAt: null });
  } catch (err) {
    console.error('GET /api/polls/:id/results', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
