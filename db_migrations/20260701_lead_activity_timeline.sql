-- Full lead audit timeline: assignments, CRM diffs, client status changes,
-- site-visit updates, and lifecycle events.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_activity_event_type') then
    create type public.lead_activity_event_type as enum (
      'lead_created',
      'assigned',
      'transferred',
      'unassigned',
      'crm_updated',
      'client_status_updated',
      'site_visit_updated',
      'lead_deleted'
    );
  end if;
end $$;

create table if not exists public.lead_activity_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.meta_leads(id) on delete cascade,
  actor_user_id uuid references public.user_profiles(id) on delete set null,
  actor_name text,
  event_type public.lead_activity_event_type not null,
  source text not null default 'manual',
  title text not null,
  description text,
  from_user_id uuid references public.user_profiles(id) on delete set null,
  from_user_name text,
  to_user_id uuid references public.user_profiles(id) on delete set null,
  to_user_name text,
  changes jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lead_activity_events_lead_created_idx
  on public.lead_activity_events (lead_id, created_at desc);
create index if not exists lead_activity_events_actor_idx
  on public.lead_activity_events (actor_user_id);
create index if not exists lead_activity_events_type_idx
  on public.lead_activity_events (event_type);

alter table public.lead_activity_events enable row level security;

drop policy if exists "super_admin full access on lead activity" on public.lead_activity_events;
create policy "super_admin full access on lead activity"
  on public.lead_activity_events for all using (is_super_admin());

drop policy if exists "exec can view lead activity for their leads" on public.lead_activity_events;
create policy "exec can view lead activity for their leads"
  on public.lead_activity_events for select
  using (
    exists (
      select 1
      from public.meta_leads ml
      where ml.id = lead_id and ml.assigned_to = auth.uid()
    )
  );

do $$
begin
  if to_regclass('public.lead_assignment_history') is not null then
    insert into public.lead_activity_events (
      lead_id,
      event_type,
      source,
      title,
      description,
      from_user_id,
      from_user_name,
      to_user_id,
      to_user_name,
      changes,
      metadata,
      created_at
    )
    select
      h.lead_id,
      case
        when h.to_user is null then 'unassigned'::public.lead_activity_event_type
        when h.from_user is null then 'assigned'::public.lead_activity_event_type
        else 'transferred'::public.lead_activity_event_type
      end,
      coalesce(h.reason, 'legacy_assignment_history'),
      case
        when h.to_user is null then 'Lead unassigned'
        when h.from_user is null then 'Lead assigned'
        else 'Lead transferred'
      end,
      'Imported from legacy lead assignment history.',
      h.from_user,
      from_user.full_name,
      h.to_user,
      to_user.full_name,
      jsonb_build_object(
        'assigned_to',
        jsonb_build_object(
          'label', 'Assigned To',
          'from', from_user.full_name,
          'to', to_user.full_name
        )
      ),
      jsonb_build_object(
        'legacy_assignment_history_id', h.id,
        'legacy_reason', h.reason
      ),
      h.created_at
    from public.lead_assignment_history h
    left join public.user_profiles from_user on from_user.id = h.from_user
    left join public.user_profiles to_user on to_user.id = h.to_user
    where not exists (
      select 1
      from public.lead_activity_events e
      where e.metadata ->> 'legacy_assignment_history_id' = h.id::text
    );
  end if;
end $$;

create or replace function public.mirror_lead_assignment_history_to_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  from_name text;
  to_name text;
begin
  select full_name into from_name from public.user_profiles where id = new.from_user;
  select full_name into to_name from public.user_profiles where id = new.to_user;

  insert into public.lead_activity_events (
    lead_id,
    event_type,
    source,
    title,
    description,
    from_user_id,
    from_user_name,
    to_user_id,
    to_user_name,
    changes,
    metadata,
    created_at
  )
  values (
    new.lead_id,
    case
      when new.to_user is null then 'unassigned'::public.lead_activity_event_type
      when new.from_user is null then 'assigned'::public.lead_activity_event_type
      else 'transferred'::public.lead_activity_event_type
    end,
    coalesce(new.reason, 'legacy_assignment_history'),
    case
      when new.to_user is null then 'Lead unassigned'
      when new.from_user is null then 'Lead assigned'
      else 'Lead transferred'
    end,
    'Mirrored from legacy lead assignment history.',
    new.from_user,
    from_name,
    new.to_user,
    to_name,
    jsonb_build_object(
      'assigned_to',
      jsonb_build_object(
        'label', 'Assigned To',
        'from', from_name,
        'to', to_name
      )
    ),
    jsonb_build_object(
      'legacy_assignment_history_id', new.id,
      'legacy_reason', new.reason
    ),
    new.created_at
  )
  on conflict do nothing;

  return new;
end $$;

do $$
begin
  if to_regclass('public.lead_assignment_history') is not null then
    drop trigger if exists lead_assignment_history_activity_mirror on public.lead_assignment_history;
    create trigger lead_assignment_history_activity_mirror
      after insert on public.lead_assignment_history
      for each row
      execute function public.mirror_lead_assignment_history_to_activity();
  end if;
end $$;
