# Pikorua CRM

A high-velocity real estate CRM for lead capture, assignment, and follow-up. Built as a pnpm + Turborepo monorepo.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui |
| Backend | NestJS 10, Drizzle ORM, PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT (jose in Next.js middleware, passport-jwt in NestJS) |
| Monorepo | pnpm workspaces + Turborepo |
| Container | Docker + docker-compose |

## Repository Layout

```
Pikorua-CRM/
├── apps/
│   ├── web/          Next.js frontend          → http://localhost:3000
│   └── api/          NestJS backend            → http://localhost:4000
│                                                  Swagger: /api/docs
├── packages/
│   ├── shared/       TypeScript types + Zod schemas
│   └── db/           Drizzle ORM schema + client
├── docker-compose.yml   PostgreSQL + Redis + api + web
├── .env.example
└── turbo.json
```

---

## Local Development (without Docker)

### 1. Prerequisites

- Node.js 22+
- pnpm 11+ (`npm i -g pnpm`)
- Docker Desktop (for PostgreSQL + Redis)

### 2. Clone and install

```bash
git clone <repo-url>
cd Pikorua-CRM
pnpm install
```

### 3. Start infrastructure

```bash
# Start PostgreSQL (port 5432) and Redis (port 6379) only
docker compose up postgres redis -d
```

### 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
DATABASE_URL=postgresql://pikorua:pikorua@localhost:5432/pikorua_crm
REDIS_URL=redis://localhost:6379
JWT_SECRET=any-long-random-string-here
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
META_WEBHOOK_VERIFY_TOKEN=any-random-string
```

Copy the same `.env` into `apps/api/`:

```bash
cp .env apps/api/.env
```

### 5. Push database schema

```bash
pnpm db:push
```

### 6. Create the first admin user

```bash
# Connect to Postgres and run:
psql postgresql://pikorua:pikorua@localhost:5432/pikorua_crm
```

```sql
INSERT INTO user_profiles (full_name, email, password_hash, role, status)
VALUES (
  'Admin',
  'admin@pikorua.com',
  -- bcrypt hash of 'password123' (change this!)
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oFkIR.kJ2',
  'super_admin',
  'active'
);
```

> For a proper hash, use: `node -e "const b=require('bcryptjs');b.hash('yourpassword',12).then(console.log)"`

### 7. Run all apps

```bash
pnpm dev
```

This starts all packages in parallel:
- `apps/web` → http://localhost:3000
- `apps/api` → http://localhost:4000 (Swagger at `/api/docs`)
- `packages/shared` and `packages/db` in watch mode

---

## Run with Docker (full stack)

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET at minimum
```

### 2. Build and start all services

```bash
docker compose up --build -d
```

Services start in dependency order:
```
postgres ──► redis ──► api ──► web
```

| Service | URL |
|---|---|
| Web (Next.js) | http://localhost:3000 |
| API (NestJS) | http://localhost:4000 |
| Swagger docs | http://localhost:4000/api/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### 3. Push schema (first run only)

```bash
# Run against the Docker Postgres instance
DATABASE_URL=postgresql://pikorua:pikorua@localhost:5432/pikorua_crm pnpm db:push
```

### 4. Create first admin (first run only)

```bash
docker compose exec postgres psql -U pikorua -d pikorua_crm -c "
INSERT INTO user_profiles (full_name, email, password_hash, role, status)
VALUES ('Admin', 'admin@pikorua.com', '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oFkIR.kJ2', 'super_admin', 'active');
"
```

### Common Docker commands

```bash
docker compose logs -f api        # stream API logs
docker compose logs -f web        # stream web logs
docker compose down               # stop all services
docker compose down -v            # stop + delete volumes (wipes DB data)
docker compose up --build api -d  # rebuild + restart API only
```

---

## Build for production

```bash
pnpm build
```

Turborepo builds in dependency order: `shared → db → api + web`.

---

## Database commands

```bash
pnpm db:push       # push schema changes directly (development)
pnpm db:generate   # generate migration SQL files
pnpm db:migrate    # run pending migrations
pnpm db:studio     # open Drizzle Studio (visual DB browser)
```

---

## API overview

All endpoints are prefixed with `/api` and require a `Bearer <token>` header (except `/api/auth/login`).

| Module | Endpoints |
|---|---|
| **Auth** | `POST /auth/login`, `GET /auth/me` |
| **Users** | `GET /users`, `POST /users`, `DELETE /users/:id` |
| **Leads** | `GET /leads`, `GET /leads/:id`, `POST /leads`, `PATCH /leads/:id` |
| **Meta Leads** | `GET /meta-leads`, `GET /meta-leads/:id`, `PATCH /:id/assign`, `POST /bulk-assign` |
| **Employees** | `GET /employees`, `GET /employees/:id` |
| **Properties** | `GET /properties`, `GET /properties/:id` |
| **Clients** | `GET /clients/:id`, `PATCH /clients/:id/status` |
| **Site Visits** | `GET /site-visits`, `POST /site-visits`, `PATCH /site-visits/:id` |
| **Bookings** | `GET /bookings`, `POST /bookings`, `PATCH /bookings/:id` |
| **Dashboard** | `GET /dashboard/stats`, `/dashboard/leads`, `/dashboard/revenue` |
| **WhatsApp** | `GET /whatsapp/conversations`, `GET /whatsapp/conversations/:leadId`, `POST /whatsapp/messages` |
| **Webhooks** | `GET /webhooks/meta` (verification), `POST /webhooks/meta` (lead ingestion) |

Full interactive docs at `http://localhost:4000/api/docs` (Swagger).

---

## Project scripts

From repo root:

```bash
pnpm dev          # start all apps in watch mode
pnpm build        # production build all packages
pnpm lint         # lint all packages
pnpm db:push      # push Drizzle schema to DB
pnpm db:studio    # open Drizzle Studio
```
