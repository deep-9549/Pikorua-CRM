-- Apply this additive migration to each microsite leads database, not the CRM database.
-- It gives the CRM importer a durable cursor and a place to store per-row errors.

do $$
begin
  if to_regclass('public.microsite_leads') is null then
    raise exception
      'public.microsite_leads does not exist. Run this on the microsite leads Supabase project/database, not the CRM database.';
  end if;

  if to_regclass('public.microsite_jobs') is null then
    raise exception
      'public.microsite_jobs does not exist. Run this after the microsite jobs table has been created.';
  end if;
end $$;

alter table public.microsite_leads
  add column if not exists crm_synced boolean not null default false,
  add column if not exists crm_synced_at timestamptz,
  add column if not exists crm_sync_error text;

create index if not exists microsite_leads_crm_synced_created_at_idx
  on public.microsite_leads (crm_synced, created_at);

create index if not exists microsite_jobs_job_id_idx
  on public.microsite_jobs (job_id);
