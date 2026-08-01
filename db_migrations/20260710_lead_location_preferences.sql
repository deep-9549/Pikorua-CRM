-- Store client preferred buying locations separately from current city/area.

ALTER TABLE public.lead_crm_details
  ADD COLUMN IF NOT EXISTS preferred_locations jsonb;
