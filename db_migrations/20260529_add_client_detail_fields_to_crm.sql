-- Add optional client detail fields captured during lead follow-up.

alter table public.lead_crm_details
  add column if not exists profession text,
  add column if not exists current_city text,
  add column if not exists current_area text;
