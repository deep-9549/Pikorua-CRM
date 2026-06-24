\set ON_ERROR_STOP on

SELECT metric, value
FROM (
  SELECT 'count.bookings' AS metric, COUNT(*)::text AS value FROM public.bookings
  UNION ALL SELECT 'count.clients', COUNT(*)::text FROM public.clients
  UNION ALL SELECT 'count.employees', COUNT(*)::text FROM public.employees
  UNION ALL SELECT 'count.lead_assignment_history', COUNT(*)::text FROM public.lead_assignment_history
  UNION ALL SELECT 'count.lead_crm_details', COUNT(*)::text FROM public.lead_crm_details
  UNION ALL SELECT 'count.lead_interactions', COUNT(*)::text FROM public.lead_interactions
  UNION ALL SELECT 'count.lead_notes', COUNT(*)::text FROM public.lead_notes
  UNION ALL SELECT 'count.meta_leads', COUNT(*)::text FROM public.meta_leads
  UNION ALL SELECT 'count.properties', COUNT(*)::text FROM public.properties
  UNION ALL SELECT 'count.site_visits', COUNT(*)::text FROM public.site_visits
  UNION ALL SELECT 'count.user_profiles', COUNT(*)::text FROM public.user_profiles

  -- Deterministic row fingerprints catch edits that record counts alone miss.
  -- Hash each row first so the aggregate string stays bounded at 32 bytes/row.
  UNION ALL
  SELECT 'digest.bookings',
    md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY t.id), ''))
  FROM public.bookings t
  UNION ALL
  SELECT 'digest.clients',
    md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY t.id), ''))
  FROM public.clients t
  UNION ALL
  SELECT 'digest.employees',
    md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY t.id), ''))
  FROM public.employees t
  UNION ALL
  SELECT 'digest.lead_assignment_history',
    md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY t.id), ''))
  FROM public.lead_assignment_history t
  UNION ALL
  SELECT 'digest.lead_crm_details',
    md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY t.id), ''))
  FROM public.lead_crm_details t
  UNION ALL
  SELECT 'digest.lead_interactions',
    md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY t.id), ''))
  FROM public.lead_interactions t
  UNION ALL
  SELECT 'digest.lead_notes',
    md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY t.id), ''))
  FROM public.lead_notes t
  UNION ALL
  SELECT 'digest.meta_leads',
    md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY t.id), ''))
  FROM public.meta_leads t
  UNION ALL
  SELECT 'digest.properties',
    md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY t.id), ''))
  FROM public.properties t
  UNION ALL
  SELECT 'digest.site_visits',
    md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY t.id), ''))
  FROM public.site_visits t
  UNION ALL
  SELECT 'digest.user_profiles',
    md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY t.id), ''))
  FROM public.user_profiles t

  UNION ALL
  SELECT 'integrity.super_admin_without_password_hash', COUNT(*)::text
  FROM public.user_profiles
  WHERE role = 'super_admin' AND password_hash IS NULL

  UNION ALL
  SELECT 'integrity.meta_leads_invalid_assigned_to', COUNT(*)::text
  FROM public.meta_leads ml
  LEFT JOIN public.user_profiles up ON up.id = ml.assigned_to
  WHERE ml.assigned_to IS NOT NULL AND up.id IS NULL

  UNION ALL
  SELECT 'integrity.meta_leads_invalid_assigned_by', COUNT(*)::text
  FROM public.meta_leads ml
  LEFT JOIN public.user_profiles up ON up.id = ml.assigned_by
  WHERE ml.assigned_by IS NOT NULL AND up.id IS NULL

  UNION ALL
  SELECT 'integrity.crm_details_without_lead', COUNT(*)::text
  FROM public.lead_crm_details d
  LEFT JOIN public.meta_leads ml ON ml.id = d.lead_id
  WHERE ml.id IS NULL

  UNION ALL
  SELECT 'integrity.assignment_history_without_lead', COUNT(*)::text
  FROM public.lead_assignment_history h
  LEFT JOIN public.meta_leads ml ON ml.id = h.lead_id
  WHERE h.lead_id IS NOT NULL AND ml.id IS NULL

  UNION ALL
  SELECT 'index.meta_leads_assigned_to_idx',
    (to_regclass('public.meta_leads_assigned_to_idx') IS NOT NULL)::text
  UNION ALL
  SELECT 'index.meta_leads_deleted_received_idx',
    (to_regclass('public.meta_leads_deleted_received_idx') IS NOT NULL)::text
  UNION ALL
  SELECT 'index.site_visits_scheduled_date_idx',
    (to_regclass('public.site_visits_scheduled_date_idx') IS NOT NULL)::text
  UNION ALL
  SELECT 'index.idx_lead_assignment_history_lead',
    (to_regclass('public.idx_lead_assignment_history_lead') IS NOT NULL)::text
) checks
ORDER BY metric;
