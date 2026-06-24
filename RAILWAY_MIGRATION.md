# Railway CRM test migration

This runbook deploys an isolated Railway copy from the `railway-test` branch.
Supabase remains production. Do not attach the production domain, enable sync
jobs, or direct live traffic to Railway during this evaluation.

## 1. Create the Railway project

Create one Railway project with four services in the same region:

- `pikorua-web`
- `pikorua-api`
- PostgreSQL
- Redis

Connect both application services to this GitHub repository and select only the
`railway-test` branch. Keep the repository root as the service root because the
Dockerfiles need shared workspace packages.

Set the API config file path to `/apps/api/railway.json` and the web config file
path to `/apps/web/railway.json`.

## 2. Prepare Railway PostgreSQL

Copy the public PostgreSQL URL for commands run from your computer. Railway
services should use the private `DATABASE_URL` reference.

```powershell
$env:SOURCE_DB_URL="<SUPABASE_SESSION_POOLER_URL_PORT_5432>"
$env:TARGET_DB_URL="<RAILWAY_PUBLIC_DATABASE_URL>"
psql $env:SOURCE_DB_URL -c "SHOW server_version;"
psql $env:TARGET_DB_URL -c "SHOW server_version;"
```

The Railway PostgreSQL version must be equal to or newer than the Supabase
source version.

Create the Drizzle-managed schema, then the assignment-history table:

```powershell
$env:DATABASE_URL=$env:TARGET_DB_URL
$env:DATABASE_SSL="false"
pnpm --filter @pikorua/db db:push
psql $env:TARGET_DB_URL -X --set=ON_ERROR_STOP=1 -f scripts/railway/bootstrap-railway.sql
```

Do not copy Supabase `auth`, RLS policies, Vault, cron, or functions that depend
on `auth.uid()`.

## 3. Copy the CRM data

Use the Supabase direct or session-pooler connection on port `5432`. Never use
the transaction pooler on port `6543`.

```powershell
$env:SOURCE_DB_URL="<SUPABASE_SESSION_POOLER_URL_PORT_5432>"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\railway\Export-SupabaseData.ps1

$env:TARGET_DB_URL="<RAILWAY_PUBLIC_DATABASE_URL>"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\railway\Restore-RailwayData.ps1
```

The restore is fail-fast and runs in one transaction. A missing table or other
restore error rolls back the complete import instead of leaving a partial copy.

Compare record counts, row fingerprints, relationship integrity, password
hashes, and important indexes:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\railway\Compare-Databases.ps1
```

Do not continue to application testing unless this comparison passes.

## 4. Configure the API service

Set these Railway variables:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
DATABASE_SSL=false
DATABASE_MAX_CONNECTIONS=10
JWT_SECRET=<new-random-staging-secret-at-least-32-characters>
WEBSITE_LEAD_SYNC_ENABLED=false
META_LEAD_SYNC_ENABLED=false
CORS_ORIGIN=https://<pikorua-web-domain>
```

Do not add production Meta, website-sync, cron, or webhook secrets. Generate an
API domain and verify:

```text
https://<pikorua-api-domain>/api/health
```

## 5. Configure the web service

Set:

```text
API_BASE_URL=https://<pikorua-api-domain>
NEXT_PUBLIC_API_BASE_URL=https://<pikorua-api-domain>
JWT_SECRET=<same-staging-secret-as-api>
```

Generate a Railway domain for the web service, update `CORS_ORIGIN` on the API,
and redeploy both services.

## 6. Read-only acceptance test

- Log in with an existing copied CRM account.
- Load dashboard statistics.
- Load lead and Meta Ads lists.
- Open lead details, notes, interactions, and assignment history.
- Test filters, clients, properties, bookings, and site-visit pages.
- Compare Supabase and Railway response times.
- Re-run `Compare-Databases.ps1` and confirm Railway has no new or modified CRM
  records after the read-only test. If production Supabase received live changes
  after the dump, review those expected differences separately.

## 7. Cleanup or promotion decision

The dump and verification outputs are stored under
`railway-migration-artifacts/`, which is ignored by Git.

If the test is abandoned, delete the local artifact directory and the Railway
project/database. If the test succeeds, create a separate cutover plan; do not
turn this test deployment into production without a fresh final sync, downtime
window, rollback plan, backups, and production secret rotation.
