# Dissertation App

Experimental polling application for analyzing scaling mechanisms and version distribution in distributed mobile applications. Built as part of an MSc dissertation at UBB.

## Architecture

Three components work together:

- **Mobile App** (React Native) — cross-platform client for Android/iOS; submits votes and receives feature-flag-gated experiences
- **REST API Backend** (Node.js + Express, port 3001) — handles votes, feature flags, version gating, rate limiting, and async event logging; documented via Swagger/OpenAPI
- **Admin Web Panel** (React + Vite, port 5173) — manages polls, feature flags, and monitors app version distribution

Data layer: MySQL. Orchestration: Docker Compose.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Node.js 20+ (for local dev or mobile)
- Android Studio (for mobile development)

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
mysqldump -u root -p dissertationdb > backup.sql
docker exec -i dissertationapp-db-1 mysql -u root -ppassword dissertationdb < backup.sql
```

**Or seed demo data:**
```bash
docker exec dissertationapp-backend-1 npm run seed
```

## Running Locally (without Docker)

**Backend:**
```bash
cd admin-app/backend
npm install
npm run dev
```

**Frontend:**
```bash
cd admin-app/frontend
npm install
npm run dev
```

**Mobile:**
```bash
cd mobile-app
npx react-native run-android
```

> Make sure MySQL is running locally and the backend `.env` is configured accordingly.

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

## Project Structure

```
dissertationapp/
├── admin-app/
│   ├── backend/     # Express REST API
│   └── frontend/    # React + Vite admin panel
├── mobile-app/      # React Native app
└── docker-compose.yml
```
