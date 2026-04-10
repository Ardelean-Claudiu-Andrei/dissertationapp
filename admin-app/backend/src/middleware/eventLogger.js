const pool = require('../db');
const { randomUUID } = require('crypto');

// Non-blocking event logger middleware.
// Attaches a 'finish' listener to the response so logging
// happens after the response is sent and does not affect latency.
// Admin routes are skipped to avoid noise in the event log.
function eventLogger(req, res, next) {
  res.on('finish', async () => {
    if (req.path.startsWith('/admin')) return;
    if (req.method === 'OPTIONS') return;

    try {
      const id = randomUUID();
      const userId = req.body?.user_id || req.query?.user_id || null;
      const eventType = `${req.method} ${req.path}`;
      const payload = JSON.stringify({
        statusCode: res.statusCode,
        query: req.query,
        deviceId: req.deviceId,
        appVersion: req.appVersion,
      });

      await pool.query(
        'INSERT INTO event_log (id, user_id, event_type, payload, created_at) VALUES (?, ?, ?, ?, NOW())',
        [id, userId, eventType, payload]
      );
    } catch {
      // Logging must never crash the server
    }
  });

  next();
}

module.exports = eventLogger;
