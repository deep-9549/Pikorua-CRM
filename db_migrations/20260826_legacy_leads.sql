-- Legacy imports are historically sourced leads that should not enter the
-- automatic reassignment loop until the first confirmed conversation.
BEGIN;

ALTER TABLE public.meta_leads
  ADD COLUMN IF NOT EXISTS legacy_import boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legacy_transfer_protected boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS meta_leads_legacy_protected_idx
  ON public.meta_leads (legacy_transfer_protected, deleted_at, received_at DESC);

CREATE OR REPLACE FUNCTION public.reassign_stale_leads()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record; next_exec uuid;
BEGIN
  FOR r IN
    SELECT ml.id, ml.assigned_to FROM public.meta_leads ml
    LEFT JOIN public.lead_crm_details c ON coalesce(to_jsonb(c)->>'lead_id', to_jsonb(c)->>'meta_lead_id')::uuid = ml.id
    WHERE ml.status = 'assigned' AND ml.assigned_at < now() - interval '48 hours'
      AND NOT coalesce(ml.legacy_transfer_protected, false)
      AND (c.call_status IS DISTINCT FROM 'spoken' OR c.hwc = 'cold')
  LOOP
    next_exec := public.pick_least_loaded_executive(r.assigned_to);
    IF next_exec IS NOT NULL THEN
      UPDATE public.meta_leads SET assigned_to = next_exec, assigned_at = now(), assigned_by = NULL, updated_at = now() WHERE id = r.id;
      INSERT INTO public.lead_assignment_history (lead_id, from_user, to_user, reason) VALUES (r.id, r.assigned_to, next_exec, 'unspoken_48h');
    END IF;
  END LOOP;
  FOR r IN
    SELECT ml.id, ml.assigned_to FROM public.meta_leads ml JOIN public.lead_crm_details c
      ON coalesce(to_jsonb(c)->>'lead_id', to_jsonb(c)->>'meta_lead_id')::uuid = ml.id
    WHERE ml.status = 'assigned' AND c.hwc = 'hot' AND ml.assigned_at < now() - interval '30 days'
      AND NOT coalesce(ml.legacy_transfer_protected, false)
  LOOP
    next_exec := public.pick_least_loaded_executive(r.assigned_to);
    IF next_exec IS NOT NULL THEN
      UPDATE public.meta_leads SET assigned_to = next_exec, assigned_at = now(), assigned_by = NULL, updated_at = now() WHERE id = r.id;
      INSERT INTO public.lead_assignment_history (lead_id, from_user, to_user, reason) VALUES (r.id, r.assigned_to, next_exec, 'hot_30d');
    END IF;
  END LOOP;
  FOR r IN
    SELECT ml.id, ml.assigned_to FROM public.meta_leads ml JOIN public.lead_crm_details c
      ON coalesce(to_jsonb(c)->>'lead_id', to_jsonb(c)->>'meta_lead_id')::uuid = ml.id
    WHERE ml.status = 'assigned' AND c.hwc = 'warm' AND ml.assigned_at < now() - interval '7 days'
      AND NOT coalesce(ml.legacy_transfer_protected, false)
  LOOP
    next_exec := public.pick_least_loaded_executive(r.assigned_to);
    IF next_exec IS NOT NULL THEN
      UPDATE public.meta_leads SET assigned_to = next_exec, assigned_at = now(), assigned_by = NULL, updated_at = now() WHERE id = r.id;
      INSERT INTO public.lead_assignment_history (lead_id, from_user, to_user, reason) VALUES (r.id, r.assigned_to, next_exec, 'warm_7d');
    END IF;
  END LOOP;
END;
$$;

COMMIT;
