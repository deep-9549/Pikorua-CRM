# CRM Frontend Handover Context (Backend)

Date: 26 May 2026
Project: CRM Frontend (Next.js App Router)
Owner: Frontend team

## Overview
- Framework: Next.js 16.2.6 (App Router)
- Language: TypeScript + React 19
- Styling: Tailwind CSS v4, custom design system in app/globals.css
- UI Components: Radix UI + custom components in components/ui
- Analytics: @vercel/analytics (only in production)
- Package manager: npm (lockfile present: pnpm-lock.yaml)

## Dev / Build
- dev: npm run dev
- build: npm run build
- start: npm run start
- lint: npm run lint

## App Structure
- App Router pages under app/
- Top-level splash screen at app/page.tsx (client)
- Auth: none (no login or guards implemented)
- Layouts:
  - app/layout.tsx (root)
  - app/(dashboard)/layout.tsx (dashboard shell)

## Routes (App Router)
- / (splash screen)
- /dashboard
- /leads
- /leads/[id]
- /whatsapp
- /properties
- /smart-matching
- /site-visits
- /meta-ads
- /ai-control
- /bookings
- /employees
- /hni-clients
- /scripts
- /reports
- /documents
- /settings

## Data Sources (Current)
- All data is mocked in lib/data.ts
- Many pages import from lib/data.ts directly (client components)
- The mock data includes:
  - leads, employees, properties
  - metaLeads, bookings, siteVisits
  - whatsappConversations
  - dashboards stats / charts data
  - helper functions (formatCurrency, getStatusColor, etc)

## Backend Integration Notes
- There are no API calls yet; all pages read from lib/data.ts
- Recommend mapping backend endpoints to the existing mock data shapes
- Main data shapes are defined in lib/data.ts (TypeScript interfaces)

### Suggested API Domains
1) Leads
- GET /api/leads
- GET /api/leads/:id
- POST /api/leads
- PATCH /api/leads/:id
- GET /api/leads/:id/notes
- POST /api/leads/:id/notes

2) Employees
- GET /api/employees
- GET /api/employees/:id

3) Properties
- GET /api/properties
- GET /api/properties/:id

4) Meta Ads Leads
- GET /api/meta-leads
- PATCH /api/meta-leads/:id (assign, status changes)

5) WhatsApp
- GET /api/whatsapp/conversations
- GET /api/whatsapp/conversations/:leadId
- POST /api/whatsapp/messages

6) Site Visits
- GET /api/site-visits
- POST /api/site-visits
- PATCH /api/site-visits/:id

7) Bookings
- GET /api/bookings
- POST /api/bookings
- PATCH /api/bookings/:id

8) Reports / Dashboard
- GET /api/dashboard/stats
- GET /api/dashboard/revenue
- GET /api/dashboard/leads

## Data Shapes (Pointers)
- Lead, Employee, Property, MetaLead, Booking, SiteVisit, WhatsAppConversation types live in lib/data.ts
- These interfaces should be the source of truth for backend response payloads

## Environment Variables
- None required right now
- Add .env.local when backend URLs are ready (example: NEXT_PUBLIC_API_BASE_URL)

## Known Dev Constraints
- Large client bundles due to all pages importing lib/data.ts
- For backend integration, replace mock data imports with API calls to reduce bundle size

## UI / UX Assumptions
- UI is optimized for a premium luxury real estate CRM
- Data is expected to be rich and formatted (currency, dates, lead status)

## Handover Checklist
- Replace mock data imports with API calls (client or server actions)
- Align backend payloads with types in lib/data.ts
- Add error and loading states per API call
- Add authentication if required (not present)

## Contact
- Frontend contact: TBD
