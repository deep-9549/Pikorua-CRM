# Pikorua CRM

Pikorua CRM is a real estate CRM built for high-velocity lead capture, assignment, and follow-up. It combines a fast Next.js front end with a Supabase-backed data model and API routes for CRM operations.

## Highlights

- Lead intake and assignment flows with admin oversight
- Role-based access and protected dashboards
- Supabase Auth + Postgres with server-side enforcement
- Modular UI with a consistent design system

## Tech Stack

- Next.js App Router (frontend)
- Supabase (Auth + Postgres)
- TypeScript, Tailwind CSS, and Radix UI

## Repository Layout

- `frontend/`: Next.js app (UI, routes, API handlers, auth proxy)
- `backend/`: SQL setup and migrations

## Quick Start

1. Install dependencies (choose one):

```bash
cd frontend
npm install
# or
pnpm install
# or
yarn install
```

2. Configure environment variables in `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<server-role-key>
META_WEBHOOK_VERIFY_TOKEN=<any-random-string>
```

3. Apply database setup:

- New project: run `backend/supabase-setup.sql`
- Existing project: run each file in `backend/migrations/` in filename order

4. Start the dev server:

```bash
cd frontend
npm run dev
```

Open http://localhost:3000.

## Admin Bootstrap

Create the first user in Supabase Auth, then promote them:

```sql
update user_profiles
set role = 'super_admin', full_name = 'Admin Name'
where id = '<auth-user-id>';
```

## Local Testing on a Team Network

```bash
cd frontend
npm run dev -- --hostname 0.0.0.0
```

Open `http://<your-local-ip>:3000` on trusted devices. Use test data only and keep the dev server private.

## Scripts

From `frontend/`:

- `npm run dev` - start local dev
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - lint code

## v0 Workflow (Optional)

This repository is linked to v0 for UI iteration. You can continue in v0 and push updates directly to this repo.

- https://v0.app/chat/projects/prj_qdUG2feV5zRf3skucCmSiwbHrcA0

## Learn More

- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- v0: https://v0.app/docs
