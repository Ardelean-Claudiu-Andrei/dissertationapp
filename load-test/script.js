import http from 'k6/http';
import { sleep, check } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // ramp up to 50 virtual users
    { duration: '1m',  target: 100 },  // hold at 100 virtual users
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed:   ['rate<0.01'],  // less than 1% error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const APP_VERSION = __ENV.APP_VERSION || '1.0.0';

export default function () {
  const deviceId = uuidv4();
  const headers = { 'Content-Type': 'application/json' };

  // 1. Register / identify the device
  const registerRes = http.post(
    `${BASE_URL}/api/users/register`,
    JSON.stringify({ device_id: deviceId, app_version: APP_VERSION }),
    { headers }
  );
  check(registerRes, { 'register ok': (r) => r.status === 200 || r.status === 201 });

  sleep(0.5);

  // 2. Fetch active polls
  const pollsRes = http.get(`${BASE_URL}/api/polls`, {
    headers: { 'x-device-id': deviceId, 'x-app-version': APP_VERSION },
  });
  check(pollsRes, { 'polls loaded': (r) => r.status === 200 });

  // 3. Vote on the first available poll (if any)
  let polls = [];
  try { polls = JSON.parse(pollsRes.body); } catch (_) {}

  if (Array.isArray(polls) && polls.length > 0) {
    const poll = polls[0];
    if (poll.options && poll.options.length > 0) {
      const optionId = poll.options[0].id;
      const userData = registerRes.json('user');
      if (userData && userData.id && optionId) {
        const voteRes = http.post(
          `${BASE_URL}/api/polls/${poll.id}/vote`,
          JSON.stringify({ option_id: optionId, user_id: userData.id }),
          { headers }
        );
        // 200 = voted, 409 = already voted (both are acceptable)
        check(voteRes, { 'vote accepted': (r) => r.status === 200 || r.status === 409 });
      }
    }
  }

  sleep(1);
}
