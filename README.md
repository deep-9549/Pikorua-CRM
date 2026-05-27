# v0-pikoria-realty-crm

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_qdUG2feV5zRf3skucCmSiwbHrcA0)

## Project Structure

- `frontend/`: Next.js app (UI, routes, API routes).
- `backend/`: Database assets and backend docs.

## Getting Started

First, move into the frontend folder and run the development server:

```bash
cd frontend
npm run dev
# or
cd frontend
yarn dev
# or
cd frontend
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `frontend/app/page.tsx`. The page auto-updates as you edit the file.

## Local Team Testing

This app uses Supabase authentication and persisted lead data. Before inviting team members to test:

1. Apply `backend/supabase-setup.sql` for a new project. For an existing project, apply the files in `backend/migrations/` in filename order through the Supabase SQL Editor.
2. Create the first login in Supabase Authentication, then promote that profile to an admin in the SQL Editor:

```sql
update user_profiles
set role = 'super_admin', full_name = 'Admin Name'
where id = '<auth-user-id>';
```

3. Confirm `frontend/.env` or `frontend/.env.local` contains your Supabase URL, anon key, and service-role key. Keep the service-role key server-side and never share the env file.
4. For testing from trusted devices on the same network, run:

```bash
cd frontend
npm run dev -- --hostname 0.0.0.0
```

Open `http://<your-local-ip>:3000` on those devices. Use dummy lead/customer data only while validating admin creation, lead assignment, executive visibility, and user removal behavior. Do not publicly expose this development server.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

<a href="https://v0.app/chat/api/kiro/clone/omwasneverhere-coder/v0-pikoria-realty-crm" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>
