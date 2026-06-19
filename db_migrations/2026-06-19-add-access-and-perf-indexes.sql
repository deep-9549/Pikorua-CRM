-- ============================================================
-- Pikorua CRM — Access-control & performance indexes
-- Adds indexes on the columns used by list filters, relation
-- joins, and the WhatsApp ownership lookups added alongside.
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- Bookings: list filters by status; lead/property are joined when loading relations.
create index if not exists bookings_status_idx       on public.bookings (status);
create index if not exists bookings_lead_id_idx      on public.bookings (lead_id);
create index if not exists bookings_property_id_idx  on public.bookings (property_id);

-- Site visits: list filters by status and orders by scheduled_date; lead is joined.
create index if not exists site_visits_status_idx          on public.site_visits (status);
create index if not exists site_visits_scheduled_date_idx  on public.site_visits (scheduled_date);
create index if not exists site_visits_lead_id_idx         on public.site_visits (lead_id);

-- Conversations: looked up and access-filtered by their lead.
create index if not exists conversations_lead_id_idx on public.conversations (lead_id);

-- Messages: always fetched for a conversation, newest first.
create index if not exists messages_conversation_sent_idx on public.messages (conversation_id, sent_at);
