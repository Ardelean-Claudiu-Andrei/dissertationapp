# Dissertation App

Experimental polling application for analyzing scaling mechanisms and version distribution in distributed mobile applications. Built as part of an MSc dissertation at UBB.

## Architecture

Three components work together:

- **Mobile App** (React Native) — cross-platform client for Android/iOS; submits votes and receives feature-flag-gated experiences
- **REST API Backend** (Node.js + Express, port 3001) — handles votes, feature flags, version gating, rate limiting, and async event logging; documented via Swagger/OpenAPI
- **Admin Web Panel** (React + Vite, port 5173) — manages polls, feature flags, and monitors app version distribution

Data layer: MySQL. Orchestration: Docker Compose.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for Docker setup)
- Node.js 20+ (for local dev or mobile)
- Android Studio (for mobile development)

## Manual MySQL Setup

Use this if you want to run the backend without Docker.

**1. Start MySQL locally.**

**2. Create the database and tables:**
```bash
mysql -u root -p < backend/sql/schema.sql
```

**3. Populate demo data:**
```bash
cd backend && npm install && npm run seed
```

**4. Configure the environment file:**
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your local credentials:

```
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_NAME=dissertationapp
DB_USER=root
DB_PASSWORD=your_password_here
JWT_SECRET=change_this_in_production
JWT_EXPIRES_IN=30d
```

## Running with Docker (recommended)

```bash
docker-compose up --build
```

| Service   | URL                              |
|-----------|----------------------------------|
| Admin UI  | http://localhost:5173            |
| API docs  | http://localhost:3001/api-docs   |

**Import existing data:**
```bash
mysqldump -u root -p dissertationapp > backup.sql
docker exec -i dissertationapp-db-1 mysql -u root -ppassword dissertationapp < backup.sql
```

**Or seed demo data:**
```bash
docker exec dissertationapp-backend-1 npm run seed
```

## Running Locally (without Docker)

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Mobile:**
```bash
cd mobile-app
npx react-native run-android
```

Edit `mobile-app/src/config.js` and set `DEV_API_HOST` to your machine's LAN IP address. Run `ipconfig getifaddr en0` on Mac to find it.

> Make sure MySQL is running locally and `backend/.env` is configured before starting the backend.

## Key Features

- **Feature flags** — SHA-256 deterministic rollout evaluation; users get consistent experiences across sessions
- **Version gating** — restrict features by app version
- **In-memory caching** — TTL-based cache with invalidation on mutations
- **Rate limiting** — vote endpoint protected against abuse
- **Async event logging** — vote and flag evaluation events logged without blocking the request path
- **Swagger/OpenAPI** — full API documentation at `/api-docs`

## Tech Stack

| Layer    | Technology                  |
|----------|-----------------------------|
| Mobile   | React Native                |
| Backend  | Node.js, Express            |
| Database | MySQL                       |
| Frontend | React, Vite                 |
| Infra    | Docker, Docker Compose      |
| Docs     | Swagger / OpenAPI           |

## Load Testing

Install k6:
```bash
brew install k6   # macOS
```

Make sure the backend is running, then:
```bash
k6 run load-test/k6-script.js
```

Key output metrics:
- **cache_hits / cache_misses** — ratio shows how effectively the in-memory TTL cache is serving repeated results requests
- **http_req_duration p(95)** — 95th-percentile latency; the script asserts this stays under the configured threshold
- **http_req_failed** — should be 0% under normal load; spikes indicate rate-limiting or backend errors

## Project Structure

```
dissertationapp/
├── admin-app/
│   ├── backend/     # Express REST API
│   └── frontend/    # React + Vite admin panel
├── mobile-app/      # React Native app
└── docker-compose.yml
```
