CREATE TABLE IF NOT EXISTS public.analytics_daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  scope_type text NOT NULL,
  scope_id text NOT NULL DEFAULT 'global',
  metrics jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS analytics_daily_snapshots_scope_date_uidx
  ON public.analytics_daily_snapshots (snapshot_date, scope_type, scope_id);
