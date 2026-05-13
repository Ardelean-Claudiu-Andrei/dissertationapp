# Load Testing — k6

Two scripts are available:
| Script | Purpose |
|--------|---------|
| `script.js` | Basic smoke test (register + list polls) |
| `k6-script.js` | Full scenario with cache metrics (register → polls → detail → results → vote) |

---

## Install k6

```bash
# macOS
brew install k6

# Windows (Chocolatey)
choco install k6

# Ubuntu / Debian
sudo gpg --no-default-keyring \
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] \
  https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

---

## Run against local backend (port 3001)

Start the backend first (`npm start` inside `admin-app/backend/`), then:

```bash
k6 run load-test/k6-script.js
```

Override the base URL if needed:

```bash
k6 run --env BASE_URL=http://localhost:3001 load-test/k6-script.js
```

---

## Run against Docker Compose / NGINX (port 8080)

```bash
# Start the full stack
docker compose up --build

# Run the test pointing at NGINX
k6 run --env BASE_URL=http://localhost:8080 load-test/k6-script.js
```

---

## Test stages

| Stage | Time | Virtual users |
|-------|------|---------------|
| Ramp up | 0 – 30s | 0 → 50 |
| Sustained | 30s – 90s | 100 |
| Ramp down | 90s – 120s | 100 → 0 |

Each virtual user per iteration:
1. `POST /api/users/register` — identify the virtual device
2. `GET /api/polls` — fetch active polls
3. `GET /api/polls/:id` — load poll detail (needed to get option IDs)
4. `GET /api/polls/:id/results` — fetch results; records `fromCache` field
5. `POST /api/polls/:id/vote` — cast a vote (409 already-voted is not an error)
6. `sleep(1)`

---

## Thresholds

| Metric | Threshold | Meaning |
|--------|-----------|---------|
| `http_req_duration p(95)` | < 500ms | 95% of all requests complete under 500ms |
| `real_error_rate` | < 0.01 (1%) | Fewer than 1% genuine errors (409 already-voted is excluded) |

The run **exits with code 1** if either threshold is breached.

> **Why not `http_req_failed`?** k6 counts any 4xx response as a failure by default. Under concurrent load, many VUs will receive 409 (already voted on the same poll) — this is expected behaviour, not an error. The custom `real_error_rate` metric tracks only truly unexpected responses.

---

## Output metrics explained

| Metric | What it means |
|--------|---------------|
| `vus` | Active virtual users at any moment |
| `http_reqs` | Total request count + RPS (requests per second) |
| `http_req_duration` | Response time breakdown: avg, min, med, max, p(90), p(95) |
| `http_req_failed` | k6 built-in — **not thresholded** (would count 409 as failure) |
| `real_error_rate` | Custom — only genuinely unexpected responses (not 409) |
| `cache_hits` | Custom counter — how many results responses had `fromCache: true` |
| `cache_misses` | Custom counter — how many results responses hit the DB |

### Cache hit/miss ratio
A high `cache_hits / (cache_hits + cache_misses)` ratio under load demonstrates that the
5-second TTL in-memory cache is effective at reducing DB reads. Under 100 VUs all
requesting results for the same poll simultaneously, virtually all responses after
the first should be cache hits within the same 5-second window.

---

## Expected results for a healthy backend

```
✓ register 200/201
✓ polls 200
✓ poll detail 200
✓ results 200
✓ vote 201/409

checks.........................: ~99%
http_req_duration p(95)........: < 500ms   ✓
real_error_rate................: < 0.01    ✓
cache_hits.....................: > cache_misses  (after warm-up)
```

If `http_req_duration p(95)` exceeds 500ms, the most likely cause is MySQL connection
pool saturation — check `connectionLimit` in `db.js` (currently 10).

---

## Check scalability stats endpoint during the test

While k6 is running, open a second terminal and poll the backend:

```bash
watch -n2 curl -s http://localhost:3001/admin/scalability/stats | jq .
```

You will see `cache.size` grow as more polls get cached, and `votes_total` and
`event_log_count` incrementing in real time.
