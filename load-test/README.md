# Load Test — k6

## Prerequisites

Install k6: https://k6.io/docs/getting-started/installation/

```bash
# macOS
brew install k6

# or via the installer
```

## Run

Make sure the backend is running on `localhost:3001`, then:

```bash
k6 run script.js
```

### Custom base URL

```bash
k6 run --env BASE_URL=http://localhost:3001 script.js
```

### Custom app version

```bash
k6 run --env APP_VERSION=1.5.0 script.js
```

## What it tests

- **Stage 1 (0–30s):** Ramp from 0 to 50 virtual users
- **Stage 2 (30s–90s):** Hold at 100 virtual users
- **Stage 3 (90s–2m):** Ramp down to 0

Each virtual user:
1. Registers a new random device (`POST /api/users/register`)
2. Fetches the poll list (`GET /api/polls`)
3. Votes on the first available poll (`POST /api/polls/:id/vote`)

## Thresholds

| Metric | Threshold |
|--------|-----------|
| p95 response time | < 500ms |
| Error rate | < 1% |

The test fails if either threshold is breached.

## Interpreting results

Key metrics in the output:
- `http_req_duration` — request latency (look at p(90), p(95), p(99))
- `http_req_failed` — % of requests that returned a non-2xx/3xx status
- `http_reqs` — total requests and RPS (requests per second)
- `vus` — active virtual users at each moment
