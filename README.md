# Dissertation App — Scalare și distribuție versiuni în aplicații mobile

## Architecture
```
Mobile App (React Native) → Backend API (Node.js/Express) → MySQL
Admin Panel (React) → Backend API
```

## Quick Start

### Backend
```bash
cd admin-app/backend
npm install
cp .env.example .env   # configurează DB_HOST, DB_USER, DB_PASS, JWT_SECRET
mysql -u root -p < sql/schema.sql
mysql -u root -p dissertationapp < sql/seed.sql
npm run dev
```

### Admin Panel
```bash
cd admin-app/frontend && npm install && npm run dev
```

### Mobile App
```bash
cd mobile-app && npm install
# Editează DEV_HOST în src/api/client.js cu IP-ul tău local
npx react-native run-android   # sau run-ios
```

## Version Simulation (Demo)
Tap de 5 ori pe titlul "Active Polls" → modal de selectare versiune
- **v1.0.0** → UI de bază, results simplu
- **v1.5.0** → Results enhanced cu animații (flag: `enhanced_results`)
- **v2.0.0** → Version Gate activ (dacă flagul `version_gate` e enabled în admin)

## Feature Flags
| Flag | min_version | rollout_pct | Efect în UI |
|------|-------------|-------------|-------------|
| `enhanced_results` | 1.5.0 | 100% | Results animat cu statistici și auto-refresh |
| `show_debug_info` | 1.0.0 | 100% | Badge cu cohort și versiune în ProfileScreen |
| `version_gate` | 2.0.0 | 100% | Blochează versiunile < 2.0.0 |
| `maintenance_mode` | 1.0.0 | 0% | Banner galben în HomeScreen |

## Load Testing
```bash
ab -n 1000 -c 50 http://localhost:3001/api/polls
ab -n 500 -c 20 http://localhost:3001/api/polls/{poll_id}/results
```
