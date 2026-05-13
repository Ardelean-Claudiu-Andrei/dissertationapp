import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter } from 'k6/metrics';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ── Custom metrics ────────────────────────────────────────────────────────────
const cacheHits   = new Counter('cache_hits');    // results served from in-memory cache
const cacheMisses = new Counter('cache_misses');  // results fetched from DB

// ── Options ───────────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 50  }, // ramp up to 50 virtual users
    { duration: '60s', target: 100 }, // hold at 100 virtual users
    { duration: '30s', target: 0   }, // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests complete under 500ms
  },
};

const BASE_URL    = __ENV.BASE_URL    || 'http://localhost:3001';
const APP_VERSION = __ENV.APP_VERSION || '1.0.0';

// ── Virtual user scenario ─────────────────────────────────────────────────────
export default function () {
  const deviceId = uuidv4();
  const jsonHeaders = {
    'Content-Type':  'application/json',
    'x-device-id':   deviceId,
    'x-app-version': APP_VERSION,
  };
  const getHeaders = {
    'x-device-id':   deviceId,
    'x-app-version': APP_VERSION,
  };

  // ── Step 1: Register device ───────────────────────────────────────────────
  const registerRes = http.post(
    `${BASE_URL}/api/users/register`,
    JSON.stringify({ device_id: deviceId, app_version: APP_VERSION }),
    { headers: jsonHeaders, tags: { name: 'register' } }
  );
  check(registerRes, { 'register 200/201': (r) => r.status === 200 || r.status === 201 });

  let userId;
  try { userId = registerRes.json('user.id'); } catch (_) {}

  if (!userId) { sleep(1); return; }

  sleep(0.2);

  // ── Step 2: Fetch active polls ─────────────────────────────────────────────
  const pollsRes = http.get(
    `${BASE_URL}/api/polls`,
    { headers: getHeaders, tags: { name: 'list_polls' } }
  );
  check(pollsRes, { 'polls 200': (r) => r.status === 200 });

  let polls = [];
  try { polls = pollsRes.json(); } catch (_) {}

  if (!Array.isArray(polls) || polls.length === 0) {
    sleep(1);
    return;
  }

  const poll = polls[0];

  // ── Step 3: Fetch poll detail to get option IDs ────────────────────────────
  // GET /api/polls returns polls without options; detail endpoint includes them.
  const detailRes = http.get(
    `${BASE_URL}/api/polls/${poll.id}`,
    { headers: getHeaders, tags: { name: 'poll_detail' } }
  );
  check(detailRes, { 'poll detail 200': (r) => r.status === 200 });

  let optionId;
  try { optionId = detailRes.json('options')[0]?.id; } catch (_) {}

  // ── Step 4: Fetch results and record cache hit/miss ────────────────────────
  const resultsRes = http.get(
    `${BASE_URL}/api/polls/${poll.id}/results`,
    { headers: getHeaders, tags: { name: 'results' } }
  );
  check(resultsRes, { 'results 200': (r) => r.status === 200 });

  try {
    if (resultsRes.json('fromCache') === true) {
      cacheHits.add(1);
    } else {
      cacheMisses.add(1);
    }
  } catch (_) {}

  sleep(0.2);

  // ── Step 5: Vote ──────────────────────────────────────────────────────────
  if (optionId) {
    const voteRes = http.post(
      `${BASE_URL}/api/polls/${poll.id}/vote`,
      JSON.stringify({ option_id: optionId, user_id: userId }),
      { headers: jsonHeaders, tags: { name: 'vote' } }
    );
    const votePassed = voteRes.status === 201 || voteRes.status === 409;
    check(voteRes, { 'vote 201/409': () => votePassed });
  }

  sleep(1);
}
