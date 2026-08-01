-- ============================================================
-- Pikorua CRM — Site Visits Tab unlock
-- Upgrade visit date columns to support time-of-day.
-- Run once. Safe to re-run.
-- ============================================================

do $$
declare
  v_type text;
begin
  select data_type into v_type
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'lead_crm_details'
     and column_name = 'visit_date';

  if v_type = 'date' then
    alter table public.lead_crm_details
      alter column visit_date type timestamptz using visit_date::timestamptz,
      alter column visit_confirmation_date type timestamptz using visit_confirmation_date::timestamptz;
  end if;
end $$;
