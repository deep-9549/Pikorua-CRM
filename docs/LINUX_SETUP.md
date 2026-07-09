# Linux Local Setup Guide

This guide is for running Pikorua CRM locally on Linux. It avoids Windows-only shell syntax and uses the project scripts that work on Linux, macOS, and Windows.

## 1. Prerequisites

Install these first:

- Git
- Docker Engine or Docker Desktop for Linux
- Docker Compose v2 (`docker compose`, not the old `docker-compose` binary)
- Node.js 22.x
- Corepack/pnpm

On Ubuntu/Debian, a typical base install is:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates build-essential
```

Install Node 22 with whichever version manager your team uses. Example with `nvm`:

```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
node --version
```

Enable pnpm through Corepack:

```bash
corepack enable
corepack prepare pnpm@11.5.0 --activate
pnpm --version
```

Docker sanity check:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

If Docker requires `sudo`, add your user to the Docker group, log out, and log back in:

```bash
sudo usermod -aG docker "$USER"
```

## 2. Clone And Install

```bash
git clone <repo-url>
cd Pikorua-CRM
pnpm install
```

If the install fails because of Node version, run:

```bash
node --version
```

The expected major version is Node 22.

## 3. Create Local Environment Files

Run:

```bash
pnpm setup:local
```

This creates the files each package actually reads:

- `.env`
- `apps/api/.env`
- `apps/web/.env.local`

Why this matters:

- The NestJS API reads `apps/api/.env` while running from `apps/api`.
- Next.js reads `apps/web/.env.local` while running from `apps/web`.
- Drizzle database commands read `.env` from the repo root.
- `JWT_SECRET` must match in the API and web env files or login succeeds but protected pages redirect back to `/login`.

To regenerate local env files:

```bash
pnpm setup:local -- --force
```

Only use `--force` when you are okay overwriting local secrets.

## 4. Start Local Database And Redis

```bash
pnpm dev:infra
```

This starts only:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

Check containers:

```bash
docker compose ps
```

Expected local database URL:

```text
postgresql://pikorua:pikorua@localhost:5432/pikorua_crm
```

## 5. Push The Database Schema

```bash
pnpm db:push
```

This uses Drizzle and the schema in `packages/db/src/schema`.

If it cannot connect, verify Postgres is healthy:

```bash
docker compose logs postgres
docker compose ps postgres
```

## 6. Create The First Super Admin

```bash
pnpm seed:admin
```

Default local login:

```text
Email: admin@pikorua.local
Password: Pikorua@123
```

To use your own local admin:

```bash
SEED_ADMIN_EMAIL=you@example.com \
SEED_ADMIN_PASSWORD='change-this-password' \
SEED_ADMIN_FULL_NAME='Your Name' \
SEED_ADMIN_PHONE='9999999999' \
pnpm seed:admin
```

## 7. Run The App

Start everything:

```bash
pnpm dev
```

Open:

- Web: http://localhost:3000
- API health: http://localhost:4000/api/health
- Swagger docs: http://localhost:4000/api/docs

You can also run API and web in separate terminals:

```bash
pnpm dev:api
pnpm dev:web
```

## 8. Full Docker Option

The normal development path is Docker for Postgres/Redis and pnpm for API/web. If you want every service in Docker:

```bash
pnpm setup:local
docker compose up --build -d
pnpm db:push
pnpm seed:admin
```

Watch logs:

```bash
docker compose logs -f api
docker compose logs -f web
```

Stop services:

```bash
docker compose down
```

Stop and delete local database data:

```bash
docker compose down -v
```

## Troubleshooting

### `pnpm: command not found`

Enable Corepack:

```bash
corepack enable
corepack prepare pnpm@11.5.0 --activate
```

### `DATABASE_URL environment variable is required`

Run:

```bash
pnpm setup:local
```

Then check:

```bash
grep '^DATABASE_URL=' .env apps/api/.env
```

### Login succeeds but protected pages redirect to `/login`

The API and web app are probably using different `JWT_SECRET` values.

Fix:

```bash
pnpm setup:local -- --force
pnpm dev
```

If you manually edit secrets, keep `JWT_SECRET` identical in:

- `apps/api/.env`
- `apps/web/.env.local`

### API cannot connect to Postgres

Check that Postgres is running:

```bash
docker compose ps postgres
docker compose logs postgres
```

The local URL should be:

```text
postgresql://pikorua:pikorua@localhost:5432/pikorua_crm
```

### Port already in use

The app expects:

- Web: `3000`
- API: `4000`
- Postgres: `5432`
- Redis: `6379`

Find the process:

```bash
sudo lsof -i :3000
sudo lsof -i :4000
sudo lsof -i :5432
sudo lsof -i :6379
```

Stop the conflicting service or change the relevant env/compose port before starting again.
