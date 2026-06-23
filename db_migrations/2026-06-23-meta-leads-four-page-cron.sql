-- Pikorua CRM: Meta Lead Ads 4-page staggered cron schedule
--
-- Use this after deploying the API build that supports:
--   POST /api/internal/meta-leads/sync?page_id=PAGE_ID
--
-- Replace:
--   https://REPLACE_ME_API_DOMAIN
--   REPLACE_ME_CRON_SECRET
--   REPLACE_ME_PAGE_1_ID
--   REPLACE_ME_PAGE_2_ID
--   REPLACE_ME_PAGE_3_ID
--   REPLACE_ME_PAGE_4_ID

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.trigger_meta_lead_sync_page(page_id text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  api_base_url text := 'https://REPLACE_ME_API_DOMAIN';
  cron_secret text := 'REPLACE_ME_CRON_SECRET';
  request_id bigint;
BEGIN
  IF page_id IS NULL OR length(trim(page_id)) = 0 OR page_id LIKE '%REPLACE_ME%' THEN
    RAISE EXCEPTION 'page_id is not configured';
  END IF;

  IF api_base_url IS NULL
     OR api_base_url LIKE '%REPLACE_ME%'
     OR api_base_url !~ '^https://[^[:space:]]+$' THEN
    RAISE EXCEPTION 'api_base_url is not configured';
  END IF;

  IF cron_secret IS NULL
     OR cron_secret LIKE '%REPLACE_ME%'
     OR length(cron_secret) < 16 THEN
    RAISE EXCEPTION 'cron_secret is not configured';
  END IF;

  SELECT net.http_post(
    url := api_base_url || '/api/internal/meta-leads/sync?page_id=' || page_id,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cron_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 50000
  ) INTO request_id;

  RETURN request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_meta_lead_sync_page(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trigger_meta_lead_sync_page(text) TO postgres;

-- Optional: remove the old all-pages five-minute schedule if it exists.
SELECT cron.unschedule('sync-meta-leads')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-meta-leads');

-- Reset these named jobs before recreating them.
SELECT cron.unschedule('sync-meta-leads-page-1')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-meta-leads-page-1');

SELECT cron.unschedule('sync-meta-leads-page-2')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-meta-leads-page-2');

SELECT cron.unschedule('sync-meta-leads-page-3')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-meta-leads-page-3');

SELECT cron.unschedule('sync-meta-leads-page-4')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-meta-leads-page-4');

-- 20-minute loop:
--   minute 00 -> page 1
--   minute 05 -> page 2
--   minute 10 -> page 3
--   minute 15 -> page 4
-- then repeat.
SELECT cron.schedule(
  'sync-meta-leads-page-1',
  '0,20,40 * * * *',
  $$ SELECT public.trigger_meta_lead_sync_page('REPLACE_ME_PAGE_1_ID'); $$
);

SELECT cron.schedule(
  'sync-meta-leads-page-2',
  '5,25,45 * * * *',
  $$ SELECT public.trigger_meta_lead_sync_page('REPLACE_ME_PAGE_2_ID'); $$
);

SELECT cron.schedule(
  'sync-meta-leads-page-3',
  '10,30,50 * * * *',
  $$ SELECT public.trigger_meta_lead_sync_page('REPLACE_ME_PAGE_3_ID'); $$
);

SELECT cron.schedule(
  'sync-meta-leads-page-4',
  '15,35,55 * * * *',
  $$ SELECT public.trigger_meta_lead_sync_page('REPLACE_ME_PAGE_4_ID'); $$
);

-- Manual test examples:
-- SELECT public.trigger_meta_lead_sync_page('REPLACE_ME_PAGE_1_ID') AS request_id;
-- SELECT id, status_code, timed_out, error_msg, content
-- FROM net._http_response
-- ORDER BY created DESC
-- LIMIT 10;

-- Schedule verification:
-- SELECT jobid, jobname, schedule, active
-- FROM cron.job
-- WHERE jobname LIKE 'sync-meta-leads-page-%'
-- ORDER BY jobname;
