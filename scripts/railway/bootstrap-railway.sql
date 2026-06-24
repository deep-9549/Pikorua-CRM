\set ON_ERROR_STOP on

-- This table exists in the current CRM database but is intentionally managed
-- outside the Drizzle schema. Run this after db:push and before restoring data.
CREATE TABLE IF NOT EXISTS public.lead_assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.meta_leads(id) ON DELETE CASCADE,
  from_user uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  to_user uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_assignment_history_lead
  ON public.lead_assignment_history (lead_id, created_at DESC);
