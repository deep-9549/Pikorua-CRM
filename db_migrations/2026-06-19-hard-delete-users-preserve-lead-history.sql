-- Run once in the Supabase SQL Editor before deploying the hard-delete API.
-- This preserves lead-related rows by nulling only their deleted-user reference.
begin;

create or replace function pg_temp.user_fk_set_null(
  target_table regclass,
  target_column text,
  new_constraint_name text
) returns void
language plpgsql
as $$
declare
  fk record;
begin
  for fk in
    select distinct constraint_row.conname
    from pg_constraint constraint_row
    join pg_attribute column_row
      on column_row.attrelid = constraint_row.conrelid
     and column_row.attnum = any (constraint_row.conkey)
    where constraint_row.contype = 'f'
      and constraint_row.conrelid = target_table
      and column_row.attname = target_column
  loop
    execute format('alter table %s drop constraint %I', target_table, fk.conname);
  end loop;

  execute format(
    'alter table %s alter column %I drop not null',
    target_table,
    target_column
  );
  execute format(
    'alter table %s add constraint %I foreign key (%I) references public.user_profiles(id) on delete set null',
    target_table,
    new_constraint_name,
    target_column
  );
end;
$$;

select pg_temp.user_fk_set_null('public.meta_leads', 'assigned_to', 'meta_leads_assigned_to_user_fk');
select pg_temp.user_fk_set_null('public.meta_leads', 'assigned_by', 'meta_leads_assigned_by_user_fk');
select pg_temp.user_fk_set_null('public.leads', 'owner_user_id', 'leads_owner_user_id_user_fk');
select pg_temp.user_fk_set_null('public.lead_notes', 'employee_id', 'lead_notes_employee_id_user_fk');
select pg_temp.user_fk_set_null('public.lead_interactions', 'employee_id', 'lead_interactions_employee_id_user_fk');
select pg_temp.user_fk_set_null('public.lead_assignment_history', 'from_user', 'lead_assignment_history_from_user_fk');
select pg_temp.user_fk_set_null('public.lead_assignment_history', 'to_user', 'lead_assignment_history_to_user_fk');
select pg_temp.user_fk_set_null('public.site_visits', 'employee_id', 'site_visits_employee_id_user_fk');
select pg_temp.user_fk_set_null('public.bookings', 'assigned_to', 'bookings_assigned_to_user_fk');
select pg_temp.user_fk_set_null('public.clients', 'status_updated_by', 'clients_status_updated_by_user_fk');
select pg_temp.user_fk_set_null('public.messages', 'sender_id', 'messages_sender_id_user_fk');
select pg_temp.user_fk_set_null('public.employees', 'user_id', 'employees_user_id_user_fk');

commit;
