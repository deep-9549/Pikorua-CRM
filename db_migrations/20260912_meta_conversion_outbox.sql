-- Durable delivery queue for direct Meta Conversions API CRM feedback.
-- Apply separately from the application deployment per production.md section 8.3.

CREATE TABLE IF NOT EXISTS public.meta_conversion_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.meta_leads(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  client_status text NOT NULL,
  event_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  last_attempt_at timestamptz,
  delivered_at timestamptz,
  meta_trace_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_conversion_outbox_status_check
    CHECK (status IN ('pending', 'processing', 'retry', 'delivered', 'permanent_failure'))
);

CREATE UNIQUE INDEX IF NOT EXISTS meta_conversion_outbox_lead_event_uidx
  ON public.meta_conversion_outbox (lead_id, event_name);

CREATE INDEX IF NOT EXISTS meta_conversion_outbox_delivery_idx
  ON public.meta_conversion_outbox (status, next_attempt_at);

-- Production uses a restricted application role. Keep local/test databases
-- portable by granting access only when that role exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pikorua_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.meta_conversion_outbox TO pikorua_app';
  END IF;
END
$$;
