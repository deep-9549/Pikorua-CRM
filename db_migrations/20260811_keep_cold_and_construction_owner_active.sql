-- Keep cold and construction-business-owner leads in the normal lead queue.
-- This is additive and safe to run more than once.

BEGIN;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS construction_business_owner boolean NOT NULL DEFAULT false;

-- Convert the old mutually-exclusive client status into the new independent flag.
UPDATE public.clients
SET
  construction_business_owner = true,
  status = NULL,
  updated_at = now()
WHERE status = 'construction_biz_owner';

-- Rows previously sent to either pool return to their normal assigned/unassigned queue.
UPDATE public.meta_leads
SET
  status = CASE
    WHEN assigned_to IS NULL THEN 'unassigned'::public.meta_lead_status
    ELSE 'assigned'::public.meta_lead_status
  END,
  updated_at = now()
WHERE deleted_at IS NULL
  AND status IN ('cold_pool', 'construction_biz_owner_pool');

-- Cold leads now rotate after 48 hours alongside not-spoken leads. They are
-- never unassigned or moved to Trash by this function.
CREATE OR REPLACE FUNCTION public.reassign_stale_leads()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  next_exec uuid;
BEGIN
  FOR r IN
    SELECT ml.id, ml.assigned_to
    FROM public.meta_leads ml
    LEFT JOIN public.lead_crm_details c
      ON coalesce(to_jsonb(c)->>'lead_id', to_jsonb(c)->>'meta_lead_id')::uuid = ml.id
    WHERE ml.status = 'assigned'
      AND ml.assigned_at < now() - interval '48 hours'
      AND (c.call_status IS DISTINCT FROM 'spoken' OR c.hwc = 'cold')
  LOOP
    next_exec := public.pick_least_loaded_executive(r.assigned_to);
    IF next_exec IS NOT NULL THEN
      UPDATE public.meta_leads
      SET assigned_to = next_exec, assigned_at = now(), assigned_by = NULL, updated_at = now()
      WHERE id = r.id;

      INSERT INTO public.lead_assignment_history (lead_id, from_user, to_user, reason)
      VALUES (r.id, r.assigned_to, next_exec, 'unspoken_48h');
    END IF;
  END LOOP;

  FOR r IN
    SELECT ml.id, ml.assigned_to
    FROM public.meta_leads ml
    JOIN public.lead_crm_details c
      ON coalesce(to_jsonb(c)->>'lead_id', to_jsonb(c)->>'meta_lead_id')::uuid = ml.id
    WHERE ml.status = 'assigned'
      AND c.hwc = 'hot'
      AND ml.assigned_at < now() - interval '30 days'
  LOOP
    next_exec := public.pick_least_loaded_executive(r.assigned_to);
    IF next_exec IS NOT NULL THEN
      UPDATE public.meta_leads
      SET assigned_to = next_exec, assigned_at = now(), assigned_by = NULL, updated_at = now()
      WHERE id = r.id;

      INSERT INTO public.lead_assignment_history (lead_id, from_user, to_user, reason)
      VALUES (r.id, r.assigned_to, next_exec, 'hot_30d');
    END IF;
  END LOOP;

  FOR r IN
    SELECT ml.id, ml.assigned_to
    FROM public.meta_leads ml
    JOIN public.lead_crm_details c
      ON coalesce(to_jsonb(c)->>'lead_id', to_jsonb(c)->>'meta_lead_id')::uuid = ml.id
    WHERE ml.status = 'assigned'
      AND c.hwc = 'warm'
      AND ml.assigned_at < now() - interval '7 days'
  LOOP
    next_exec := public.pick_least_loaded_executive(r.assigned_to);
    IF next_exec IS NOT NULL THEN
      UPDATE public.meta_leads
      SET assigned_to = next_exec, assigned_at = now(), assigned_by = NULL, updated_at = now()
      WHERE id = r.id;

      INSERT INTO public.lead_assignment_history (lead_id, from_user, to_user, reason)
      VALUES (r.id, r.assigned_to, next_exec, 'warm_7d');
    END IF;
  END LOOP;
END;
$$;

COMMIT;
