const express = require('express');
const router = express.Router();
const pool = require('../../db');

router.get('/', async (req, res) => {
  try {
    const [[{ total_users }]] = await pool.query('SELECT COUNT(*) as total_users FROM users');
    const [[{ total_votes }]] = await pool.query('SELECT COUNT(*) as total_votes FROM votes');
    const [[{ total_polls }]] = await pool.query('SELECT COUNT(*) as total_polls FROM polls');
    const [[{ active_polls }]] = await pool.query("SELECT COUNT(*) as active_polls FROM polls WHERE status = 'active'");
    const [[{ flags_active }]] = await pool.query('SELECT COUNT(*) as flags_active FROM feature_flags WHERE enabled = 1');

    const [votes_per_poll] = await pool.query(`
      SELECT p.id as poll_id, p.title,
             COALESCE(SUM(o.vote_count), 0) as vote_count
      FROM polls p
      LEFT JOIN options o ON o.poll_id = p.id
      GROUP BY p.id
      ORDER BY vote_count DESC
      LIMIT 10
    `);

    const [version_rows] = await pool.query(`
      SELECT app_version, COUNT(*) as count
      FROM users
      GROUP BY app_version
      ORDER BY count DESC
    `);
    const version_distribution = Object.fromEntries(version_rows.map(r => [r.app_version, Number(r.count)]));

    const [cohort_rows] = await pool.query(`
      SELECT cohort, COUNT(*) as count
      FROM users
      GROUP BY cohort
    `);
    const cohort_distribution = Object.fromEntries(cohort_rows.map(r => [r.cohort, Number(r.count)]));

    const [top_flags] = await pool.query(`
      SELECT f.name as flag_name, COUNT(fa.id) as assignment_count
      FROM feature_flags f
      LEFT JOIN flag_assignments fa ON fa.flag_id = f.id
      GROUP BY f.id
      ORDER BY assignment_count DESC
      LIMIT 5
    `);

    return res.json({
      total_users: Number(total_users),
      total_votes: Number(total_votes),
      total_polls: Number(total_polls),
      active_polls: Number(active_polls),
      flags_active: Number(flags_active),
      votes_per_poll,
      version_distribution,
      cohort_distribution,
      top_flag_assignments: top_flags,
    });
  } catch (err) {
    console.error('GET /admin/stats', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
