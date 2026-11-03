# Akshaya Vana Ecosystem Operations Platform

Akshaya Vana is a synthetic climate-operations workspace for tracking restoration projects from planning through monitoring, verification, credit issuance, and corporate offset stages. It fits an ecosystem-operations team by combining lifecycle tracking, standard metric keys, MRV-style field and remote-sensing sources, role-based access, and a public impact endpoint.

## Features

- Portfolio dashboard with progress, schedule health, lifecycle, SDG, and standard breakdowns
- Project creation, editing, lifecycle changes, members, goals, and progress history
- Standard metric keys for trees, hectares, CO2, species, households, and biodiversity
- Append-only progress entries with corrections and activity logs
- Admin user management
- Role-based permissions for administrators, managers, field officers, and investors/partners
- Public `GET /api/public/impact` endpoint
- Responsive, accessible React interface with an application error boundary

## Tech stack

- **React + Vite** - fast, component-based client and production build
- **Tailwind CSS** - consistent responsive visual system
- **Express** - small, explicit API and production static-file server
- **Prisma + PostgreSQL** - typed relational persistence and migrations
- **Vitest + Supertest** - API and domain behavior tests
- **Recharts** - accessible dashboard visualizations

## Architecture

```mermaid
flowchart LR
  Browser[React/Vite client] -->|same-origin JSON| Express[Express API]
  Express --> Auth[Auth middleware]
  Express --> Services[Domain services]
  Services --> Prisma[Prisma Client]
  Prisma --> Postgres[(PostgreSQL)]
  Express --> Public[Public impact endpoint]
  Express --> Dist[client/dist SPA fallback]
```

## ER diagram

```mermaid
erDiagram
  USER ||--o{ PROJECT : manages
  USER ||--o{ PROJECT_MEMBER : joins
  PROJECT ||--o{ PROJECT_MEMBER : has
  PROJECT ||--o{ PROJECT_GOAL : defines
  PROJECT_GOAL ||--o{ PROGRESS_ENTRY : records
  USER ||--o{ PROGRESS_ENTRY : creates
  PROJECT ||--o{ ACTIVITY_LOG : records
  USER ||--o{ ACTIVITY_LOG : authors
```

## How progress changes are handled

For a 1,000-tree goal, an initial set of entries can total 600 planted trees. A later field reconciliation updates the total to 850 through the progress service, which appends a `CORRECTION` entry of `+250`; it does not overwrite or delete the original entries. The service also writes an activity log containing the before value of 600 and after value of 850.

The dashboard, project detail page, progress history, and public summaries all recompute from the same progress service, so they show the same aggregate. For `SUM` goals, entries are summed; for `LATEST` goals, the newest dated value is used. Changing a target changes the percentage and schedule-health calculation without changing historical entries. Invalid values, malformed payloads, impossible dates, and invalid targets are rejected with a validation error. Users without the required role receive a clear authorization error and cannot mutate the data.

## Permissions matrix

| Capability | Admin | Manager | Field officer | Investor / partner |
|---|---:|---:|---:|---:|
| View dashboard and projects | Yes | Yes | Yes | Yes |
| View project detail | Yes | Yes | Yes | Yes |
| Create projects | Yes | Yes | No | No |
| Edit managed projects | Yes | Own projects | No | No |
| Change lifecycle / goals | Yes | Own projects | No | No |
| Add progress | Yes | Own projects | Assigned projects | No |
| Manage users | Yes | No | No | No |
| View `/api/public/impact` | Yes | Yes | Yes | Yes |

## API overview

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/health`
- `GET /api/dashboard`, `GET /api/activity/recent`
- `GET /api/projects`, `GET /api/projects/:id`
- Project, goal, lifecycle, member, progress-entry, and user mutation endpoints under `/api`
- `GET /api/public/impact` for unauthenticated public impact data

Unknown API routes return a JSON 404. In production, non-API routes serve the client SPA so deep links can refresh safely.

## Local setup and run

Requirements: Node.js 20+ and a PostgreSQL database.

```bash
cp .env.example .env
npm run install-all
npm run build
npm run seed
npm run dev
```

The development client runs on Vite's port and proxies API requests to the server. To run the production shape:

```bash
NODE_ENV=production npm run build
NODE_ENV=production npm start
```

The server listens on `PORT` (4000 by default).

## Environment variables

Use placeholder values in local or deployment configuration; never commit real secrets.

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE
DATABASE_URL_UNPOOLED=postgresql://USER:PASSWORD@HOST/DATABASE
JWT_SECRET=replace-with-a-long-random-secret
NODE_ENV=development
PORT=4000
LOGIN_RATE_LIMIT_WINDOW_MINUTES=15
LOGIN_RATE_LIMIT_MAX_ATTEMPTS=10
```

These are the only environment variables read by `server/src/config/env.js`.

## Deploying to Render

Create a web service from this repository with build command `npm run build` and start command `npm start`. Configure `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `JWT_SECRET`, `NODE_ENV=production`, `LOGIN_RATE_LIMIT_WINDOW_MINUTES`, and `LOGIN_RATE_LIMIT_MAX_ATTEMPTS`; Render sets `PORT` automatically, so do not hardcode it in deployment configuration. Generate a fresh, long random `JWT_SECRET` for every deployed environment and never reuse the placeholder. The free tier sleeps when idle, so the first request after inactivity can take about a minute.

## Seed data

`npm run seed` clears the configured database and recreates synthetic demo data:

```bash
npm run seed
```

Demo password for every role: `Password@123`.

| Role | Email |
|---|---|
| Administrator | `admin@akshayavana.demo` |
| Project manager | `manager@akshayavana.demo` |
| Second project manager | `manager2@akshayavana.demo` |
| Field technician | `field@akshayavana.demo` |
| Investor / partner | `investor@akshayavana.demo` |

Live URL: `LIVE_URL_HERE`

## Tests

```bash
cd server
npm test

cd ../client
npm run build
```

## AI-assisted development

GitHub Copilot and Claude assisted with code and architecture. The author reviewed the implementation and can explain the code and design decisions.

All data is synthetic demo data inspired by the company's public website; it is not operational or production business data.

## Features not completed

- Interactive map view
- Carbon credit ledger and issuance workflow
- Entry verification flag and verification workflow
- External MRV provider integrations
- Production email delivery and password recovery

## What I would improve with more time

- Add a map with project geometry and field layers
- Add stronger audit exports and CSV reporting
- Add background ingestion for satellite, drone, and field systems
- Add an entry-verification workflow with reviewer permissions and audit history
- Add automated accessibility checks and end-to-end deployment smoke tests
