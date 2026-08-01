-- ============================================================
-- Pikorua CRM — Phase 1 Production Update
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run.
-- ============================================================

-- ── 1. Extend meta_leads.status to include 'cold_pool' ────────
alter table public.meta_leads drop constraint if exists meta_leads_status_check;
alter table public.meta_leads
  add constraint meta_leads_status_check
  check (status in ('unassigned', 'assigned', 'cold_pool'));

-- ── 2. Extend meta_leads.source to include 'migrated' ─────────
alter table public.meta_leads drop constraint if exists meta_leads_source_check;
alter table public.meta_leads
  add constraint meta_leads_source_check
  check (source in ('meta_ad', 'manual', 'migrated'));

-- ── 3. Assignment history (logs every transfer) ──────────────
create table if not exists public.lead_assignment_history (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid references public.meta_leads(id) on delete cascade,
  from_user  uuid references public.user_profiles(id),
  to_user    uuid references public.user_profiles(id),
  reason     text check (reason in ('manual','bulk','unspoken_48h','hot_30d','warm_7d','cold_pool')),
  created_at timestamptz default now()
);
create index if not exists idx_lead_assignment_history_lead on public.lead_assignment_history (lead_id, created_at desc);

alter table public.lead_assignment_history enable row level security;

drop policy if exists "super_admin full access on assignment history" on public.lead_assignment_history;
create policy "super_admin full access on assignment history"
  on public.lead_assignment_history for all using (is_super_admin());

drop policy if exists "exec can view history for their leads" on public.lead_assignment_history;
create policy "exec can view history for their leads"
  on public.lead_assignment_history for select
  using (
    exists (
      select 1 from public.meta_leads ml
      where ml.id = lead_id and ml.assigned_to = auth.uid()
    )
  );

-- ── 4. Pick least-loaded active sales executive (excluding one) ─
create or replace function public.pick_least_loaded_executive(exclude_user uuid)
returns uuid
language sql
security definer
set search_path = public
as $$
  select p.id
  from public.user_profiles p
  left join public.meta_leads ml
    on ml.assigned_to = p.id and ml.status = 'assigned'
  where p.role = 'sales_executive'
    and (exclude_user is null or p.id <> exclude_user)
  group by p.id
  order by count(ml.id) asc, random()
  limit 1
$$;

-- ── 5. Reassign stale leads (called by pg_cron) ──────────────
create or replace function public.reassign_stale_leads()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r        record;
  next_exec uuid;
begin
  -- ① Cold leads → cold pool (unassign, super-admin handles)
  for r in
    select ml.id, ml.assigned_to
    from public.meta_leads ml
    join public.lead_crm_details c on c.meta_lead_id = ml.id
    where ml.status = 'assigned' and c.hwc = 'cold'
  loop
    update public.meta_leads
      set status = 'cold_pool', assigned_to = null, assigned_at = null
      where id = r.id;
    insert into public.lead_assignment_history (lead_id, from_user, to_user, reason)
      values (r.id, r.assigned_to, null, 'cold_pool');
  end loop;

  -- ② Unspoken > 48h → round-robin
  for r in
    select ml.id, ml.assigned_to
    from public.meta_leads ml
    left join public.lead_crm_details c on c.meta_lead_id = ml.id
    where ml.status = 'assigned'
      and ml.assigned_at < now() - interval '48 hours'
      and (c.call_status is distinct from 'spoken')
  loop
    next_exec := public.pick_least_loaded_executive(r.assigned_to);
    if next_exec is not null then
      update public.meta_leads
        set assigned_to = next_exec, assigned_at = now(), assigned_by = null
        where id = r.id;
      insert into public.lead_assignment_history (lead_id, from_user, to_user, reason)
        values (r.id, r.assigned_to, next_exec, 'unspoken_48h');
    end if;
  end loop;

  -- ③ Hot > 30 days → round-robin
  for r in
    select ml.id, ml.assigned_to
    from public.meta_leads ml
    join public.lead_crm_details c on c.meta_lead_id = ml.id
    where ml.status = 'assigned'
      and c.hwc = 'hot'
      and ml.assigned_at < now() - interval '30 days'
  loop
    next_exec := public.pick_least_loaded_executive(r.assigned_to);
    if next_exec is not null then
      update public.meta_leads
        set assigned_to = next_exec, assigned_at = now(), assigned_by = null
        where id = r.id;
      insert into public.lead_assignment_history (lead_id, from_user, to_user, reason)
        values (r.id, r.assigned_to, next_exec, 'hot_30d');
    end if;
  end loop;

  -- ④ Warm > 7 days → round-robin
  for r in
    select ml.id, ml.assigned_to
    from public.meta_leads ml
    join public.lead_crm_details c on c.meta_lead_id = ml.id
    where ml.status = 'assigned'
      and c.hwc = 'warm'
      and ml.assigned_at < now() - interval '7 days'
  loop
    next_exec := public.pick_least_loaded_executive(r.assigned_to);
    if next_exec is not null then
      update public.meta_leads
        set assigned_to = next_exec, assigned_at = now(), assigned_by = null
        where id = r.id;
      insert into public.lead_assignment_history (lead_id, from_user, to_user, reason)
        values (r.id, r.assigned_to, next_exec, 'warm_7d');
    end if;
  end loop;
end $$;

-- ── 6. Schedule every 30 minutes via pg_cron ─────────────────
-- NOTE: enable the pg_cron extension first:
--   Supabase Dashboard → Database → Extensions → search "pg_cron" → enable
create extension if not exists pg_cron;

-- Remove any prior schedule with the same name, then (re)create
select cron.unschedule('reassign-stale-leads')
  where exists (select 1 from cron.job where jobname = 'reassign-stale-leads');

select cron.schedule(
  'reassign-stale-leads',
  '*/30 * * * *',
  $$ select public.reassign_stale_leads(); $$
);

-- Manual run for testing:  select public.reassign_stale_leads();
