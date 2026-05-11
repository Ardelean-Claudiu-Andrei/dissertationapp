const express = require('express');
const router = express.Router();
const pool = require('../../db');
const APP_VERSIONS = require('../../config/app_versions');
const { getVersionForCohort } = require('../../helpers/cohortAssigner');

/**
 * @swagger
 * /admin/versions:
 *   get:
 *     summary: Get all app version configurations
 *     tags: [Admin - Versions]
 *     responses:
 *       200:
 *         description: List of V1/V2/V3 configs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   version:
 *                     type: string
 *                   label:
 *                     type: string
 *                   theme:
 *                     type: string
 *                   features:
 *                     type: object
 */
router.get('/', (req, res) => {
  const versions = Object.entries(APP_VERSIONS).map(([version, config]) => ({
    version,
    ...config,
  }));
  return res.json(versions);
});

/**
 * @swagger
 * /admin/versions/distribution:
 *   get:
 *     summary: Get user count per app version
 *     tags: [Admin - Versions]
 *     responses:
 *       200:
 *         description: User distribution across V1/V2/V3
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   version:
 *                     type: string
 *                   label:
 *                     type: string
 *                   cohort:
 *                     type: string
 *                   user_count:
 *                     type: integer
 *                   percentage:
 *                     type: number
 */
router.get('/distribution', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT cohort, COUNT(*) as user_count
      FROM users
      GROUP BY cohort
    `);

    const total = rows.reduce((sum, r) => sum + Number(r.user_count), 0);

    const cohortMap = { cohort_a: 0, cohort_b: 0, cohort_c: 0 };
    rows.forEach((r) => {
      if (cohortMap[r.cohort] !== undefined) cohortMap[r.cohort] = Number(r.user_count);
    });

    const distribution = Object.entries(cohortMap).map(([cohort, user_count]) => {
      const version = getVersionForCohort(cohort);
      const config = APP_VERSIONS[version];
      return {
        version,
        label: config.label,
        cohort,
        user_count,
        percentage: total > 0 ? Math.round((user_count / total) * 100) : 0,
      };
    });

    return res.json({ total, distribution });
  } catch (err) {
    console.error('GET /admin/versions/distribution', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
