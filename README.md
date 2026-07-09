# Pikorua CRM

A real estate CRM for lead capture, assignment, follow-up, employee reporting, and sales operations.

This repo is a pnpm + Turborepo monorepo:

```text
Pikorua-CRM/
|-- apps/
|   |-- web/          Next.js frontend: http://localhost:3000
|   `-- api/          NestJS backend:   http://localhost:4000/api
|                                      Swagger: /api/docs
|-- packages/
|   |-- shared/       Shared TypeScript types and schemas
|   `-- db/           Drizzle ORM schema and database tooling
|-- scripts/          Local setup helpers
|-- docker-compose.yml
|-- .env.example
`-- turbo.json
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | NestJS 10, Drizzle ORM |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT cookies in web, passport-jwt in API |
| Monorepo | pnpm workspaces + Turborepo |
| Local infra | Docker Compose |

## Linux Setup

Use the detailed Linux guide here:

[docs/LINUX_SETUP.md](docs/LINUX_SETUP.md)

Fast path after installing Node 22, pnpm, Docker, and Docker Compose:

```bash
pnpm install
pnpm setup:local
pnpm dev:infra
pnpm db:push
pnpm seed:admin
pnpm dev
```

Open:

- Web: http://localhost:3000
- API health: http://localhost:4000/api/health
- Swagger: http://localhost:4000/api/docs

Default local seed login:

- Email: `admin@pikorua.local`
- Password: `Pikorua@123`

Override the seeded admin with these optional env vars before running `pnpm seed:admin`:

```bash
SEED_ADMIN_EMAIL=you@example.com \
SEED_ADMIN_PASSWORD='change-this-password' \
SEED_ADMIN_FULL_NAME='Your Name' \
SEED_ADMIN_PHONE='9999999999' \
pnpm seed:admin
```

## Common Commands

```bash
pnpm setup:local  # create .env, apps/api/.env, apps/web/.env.local
pnpm dev:infra    # start local Postgres and Redis
pnpm dev          # start all workspaces in watch mode
pnpm dev:api      # start only the NestJS API
pnpm dev:web      # start only the Next.js web app
pnpm db:push      # push Drizzle schema to local Postgres
pnpm db:generate  # generate Drizzle migration files
pnpm db:migrate   # run pending migrations
pnpm db:studio    # open Drizzle Studio
pnpm seed:admin   # create the first local super admin
pnpm build        # production build
pnpm lint         # TypeScript/lint checks
```

## Docker Full Stack

For local development, the recommended path is to run Postgres and Redis in Docker, then run API/web with pnpm.

To run the full stack in Docker:

```bash
pnpm setup:local
docker compose up --build -d
pnpm db:push
pnpm seed:admin
```

Useful Docker commands:

```bash
docker compose logs -f api
docker compose logs -f web
docker compose down
docker compose down -v  # removes database and Redis volumes
```

## Notes

- `JWT_SECRET` must match between `apps/api/.env` and `apps/web/.env.local`; `pnpm setup:local` handles this.
- `DATABASE_URL` should point to `postgresql://pikorua:pikorua@localhost:5432/pikorua_crm` for the local compose database.
- Do not commit `.env`, `apps/api/.env`, or `apps/web/.env.local`.
