-- Pikorua CRM: Meta Lead Ads periodic Bulk Read sync
--
-- DEPLOYMENT ORDER
--   1. Run section A before deploying the API.
--   2. Deploy the API with META_LEAD_SYNC_ENABLED=true and the documented env vars.
--   3. Replace both REPLACE_ME values in section B, then run sections B-D.
--   4. Manually test once before enabling section E (the five-minute schedule).

-- ============================================================================
-- A. Durable form progress and cross-instance lease
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.meta_lead_sync_state (
  form_id text PRIMARY KEY,
  page_id text NOT NULL,
  form_name text,
  status text NOT NULL DEFAULT 'UNKNOWN',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_successful_created_at timestamptz,
  last_successful_sync_at timestamptz,
  backfill_since timestamptz NOT NULL,
  backfill_after_cursor text,
  backfill_completed_at timestamptz,
  supports_time_filtering boolean,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_sync_locks (
  key text PRIMARY KEY,
  owner_id text NOT NULL,
  locked_until timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_lead_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.meta_lead_sync_state FROM anon, authenticated;
REVOKE ALL ON TABLE public.integration_sync_locks FROM anon, authenticated;

COMMENT ON TABLE public.meta_lead_sync_state IS
  'Discovered Meta Lead Ads forms and their durable Bulk Read watermarks.';
COMMENT ON TABLE public.integration_sync_locks IS
  'Expiring cross-instance leases for serverless integration jobs.';

-- ============================================================================
-- B. Supabase extensions and Vault secrets
-- Replace the two values below before running this section.
-- Use the direct API deployment URL, ending in /api/internal/meta-leads/sync.
-- CRON_SECRET must exactly match the API deployment environment variable.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

SELECT vault.create_secret(
  'https://REPLACE_ME_API_DOMAIN/api/internal/meta-leads/sync',
  'meta_lead_sync_url',
  'Pikorua CRM Meta lead sync endpoint'
)
WHERE NOT EXISTS (
  SELECT 1 FROM vault.secrets WHERE name = 'meta_lead_sync_url'
);

SELECT vault.create_secret(
  'REPLACE_ME_CRON_SECRET',
  'meta_lead_sync_cron_secret',
  'Bearer secret for the Pikorua CRM Meta lead sync endpoint'
)
WHERE NOT EXISTS (
  SELECT 1 FROM vault.secrets WHERE name = 'meta_lead_sync_cron_secret'
);

-- If either named secret already existed, update it to the replacement value.
SELECT vault.update_secret(
  (SELECT id FROM vault.secrets WHERE name = 'meta_lead_sync_url' LIMIT 1),
  'https://REPLACE_ME_API_DOMAIN/api/internal/meta-leads/sync',
  'meta_lead_sync_url',
  'Pikorua CRM Meta lead sync endpoint'
);

SELECT vault.update_secret(
  (SELECT id FROM vault.secrets WHERE name = 'meta_lead_sync_cron_secret' LIMIT 1),
  'REPLACE_ME_CRON_SECRET',
  'meta_lead_sync_cron_secret',
  'Bearer secret for the Pikorua CRM Meta lead sync endpoint'
);

-- ============================================================================
-- C. Protected HTTP trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_meta_lead_sync()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  sync_url text;
  cron_secret text;
  request_id bigint;
BEGIN
  SELECT decrypted_secret INTO sync_url
  FROM vault.decrypted_secrets
  WHERE name = 'meta_lead_sync_url'
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT decrypted_secret INTO cron_secret
  FROM vault.decrypted_secrets
  WHERE name = 'meta_lead_sync_cron_secret'
  ORDER BY created_at DESC
  LIMIT 1;

  IF sync_url IS NULL
     OR sync_url !~ '^https://[^[:space:]]+/api/internal/meta-leads/sync$' THEN
    RAISE EXCEPTION 'meta_lead_sync_url is not configured';
  END IF;
  IF cron_secret IS NULL OR length(cron_secret) < 16 THEN
    RAISE EXCEPTION 'meta_lead_sync_cron_secret is not configured';
  END IF;

  SELECT net.http_post(
    url := sync_url,
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

REVOKE ALL ON FUNCTION public.trigger_meta_lead_sync() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trigger_meta_lead_sync() TO postgres;

-- ============================================================================
-- D. MANUAL TEST -- run this and inspect API logs before enabling the schedule
-- ============================================================================

SELECT public.trigger_meta_lead_sync() AS request_id;

-- pg_net writes responses asynchronously. Wait several seconds, then inspect:
-- SELECT id, status_code, timed_out, error_msg, content
-- FROM net._http_response
-- ORDER BY created DESC
-- LIMIT 5;

-- Confirm discovered forms and progress without exposing lead PII:
-- SELECT form_id, form_name, status, last_successful_sync_at,
--        backfill_completed_at, last_error
-- FROM public.meta_lead_sync_state
-- ORDER BY form_name NULLS LAST;

-- ============================================================================
-- E. ENABLE THE FIVE-MINUTE SCHEDULE only after the manual test succeeds
-- ============================================================================

SELECT cron.unschedule('sync-meta-leads')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-meta-leads');

SELECT cron.schedule(
  'sync-meta-leads',
  '*/5 * * * *',
  $$ SELECT public.trigger_meta_lead_sync(); $$
);

-- Rollback switch (stops polling without deleting leads or sync history):
-- SELECT cron.unschedule('sync-meta-leads');

-- Schedule verification:
-- SELECT jobid, jobname, schedule, active
-- FROM cron.job
-- WHERE jobname = 'sync-meta-leads';
