-- Run this once in the CRM Supabase SQL editor before enabling website sync.
-- It gives every imported website row a stable idempotency key, preventing
-- duplicate CRM leads when a sync is retried.

ALTER TABLE public.meta_leads
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS meta_leads_source_external_id_uidx
  ON public.meta_leads (source, external_id)
  WHERE external_id IS NOT NULL;

COMMENT ON COLUMN public.meta_leads.external_id IS
  'Stable row identifier from an external lead source; unique within source.';
