require('dotenv').config();
const os = require('os');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const pool = require('./db');
const parseHeaders = require('./middleware/parseHeaders');
const eventLogger = require('./middleware/eventLogger');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const pollsRoutes = require('./routes/polls');
const flagsRoutes = require('./routes/flags');
const adminPollsRoutes = require('./routes/admin/polls');
const adminFlagsRoutes = require('./routes/admin/flags');
const adminEventsRoutes = require('./routes/admin/events');
const adminUsersRoutes = require('./routes/admin/users');
const adminStatsRoutes = require('./routes/admin/stats');
const adminVersionsRoutes = require('./routes/admin/versions');
const adminScalabilityRoutes = require('./routes/admin/scalability');

const app = express();
const PORT = process.env.PORT || 3001;

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Dissertation App API', version: '1.0.0', description: 'Admin + Mobile API' },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
      schemas: {
        Poll: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['draft', 'active', 'closed'] },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            options: { type: 'array', items: { $ref: '#/components/schemas/Option' } },
          },
        },
        Option: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            poll_id: { type: 'string', format: 'uuid' },
            text: { type: 'string' },
            vote_count: { type: 'integer' },
          },
        },
        Flag: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            enabled: { type: 'boolean' },
            rollout_pct: { type: 'integer', minimum: 0, maximum: 100 },
            min_version: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            device_id: { type: 'string' },
            app_version: { type: 'string' },
            country: { type: 'string' },
            cohort: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  },
  apis: ['./src/routes/**/*.js'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(parseHeaders);
app.use(eventLogger); // must be before routes so it can attach res.on('finish')

// Public API (consumed by mobile app)
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/polls', pollsRoutes);
app.use('/api/flags', flagsRoutes);

// Admin API (consumed by admin web app)
app.use('/admin/polls', adminPollsRoutes);
app.use('/admin/flags', adminFlagsRoutes);
app.use('/admin/events', adminEventsRoutes);
app.use('/admin/users', adminUsersRoutes);
app.use('/admin/stats', adminStatsRoutes);
app.use('/admin/versions', adminVersionsRoutes);
app.use('/admin/scalability', adminScalabilityRoutes);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check — returns instance identity and DB connectivity
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is up
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:          { type: string, example: ok }
 *                 uptime_seconds:  { type: number, example: 42.3 }
 *                 timestamp:       { type: string, format: date-time }
 *                 db:              { type: string, enum: [connected, error] }
 */
app.get('/health', async (req, res) => {
  let db = 'error';
  try {
    await pool.query('SELECT 1');
    db = 'connected';
  } catch (_) {}

  res.json({
    status: 'ok',
    uptime_seconds: Math.round(process.uptime() * 10) / 10,
    timestamp: new Date().toISOString(),
    db,
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
