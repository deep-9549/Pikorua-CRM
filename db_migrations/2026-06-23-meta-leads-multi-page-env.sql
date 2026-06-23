-- Multi-page Meta Lead Ads support.
-- Run this in Supabase SQL Editor before deploying the multi-page API build.

ALTER TABLE public.meta_leads
  ADD COLUMN IF NOT EXISTS page_id text,
  ADD COLUMN IF NOT EXISTS page_name text;

CREATE INDEX IF NOT EXISTS meta_leads_page_id_idx
  ON public.meta_leads (page_id);

-- Optional verification:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'meta_leads'
--   AND column_name IN ('page_id', 'page_name');
