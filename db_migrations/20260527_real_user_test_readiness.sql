-- Prepare an existing project for authenticated local team testing.

alter table user_profiles
  add column if not exists email text;

update user_profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and p.email is distinct from u.email;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'New User'), new.email, 'sales_executive');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function handle_user_profile_delete()
returns trigger as $$
begin
  update meta_leads
  set assigned_to = null,
      assigned_at = null,
      status = 'unassigned'
  where assigned_to = old.id;

  update meta_leads
  set assigned_by = null
  where assigned_by = old.id;

  update lead_crm_details
  set updated_by = null
  where updated_by = old.id;

  return old;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists before_user_profile_delete on user_profiles;
create trigger before_user_profile_delete
  before delete on user_profiles
  for each row execute procedure handle_user_profile_delete();

create or replace function is_super_admin()
returns boolean as $$
  select exists (
    select 1
    from user_profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$ language sql stable security definer set search_path = public;

revoke all on function is_super_admin() from public;
grant execute on function is_super_admin() to authenticated;

alter table user_profiles enable row level security;
alter table meta_leads enable row level security;
alter table lead_crm_details enable row level security;

drop policy if exists "users can view own profile" on user_profiles;
create policy "users can view own profile"
  on user_profiles for select
  using (auth.uid() = id);

drop policy if exists "super_admin can view all profiles" on user_profiles;
create policy "super_admin can view all profiles"
  on user_profiles for select
  using (is_super_admin());

drop policy if exists "super_admin can update all profiles" on user_profiles;
create policy "super_admin can update all profiles"
  on user_profiles for update
  using (is_super_admin())
  with check (is_super_admin());

drop policy if exists "super_admin can do everything on meta_leads" on meta_leads;
create policy "super_admin can do everything on meta_leads"
  on meta_leads for all
  using (is_super_admin())
  with check (is_super_admin());

drop policy if exists "sales_executive can view assigned leads" on meta_leads;
create policy "sales_executive can view assigned leads"
  on meta_leads for select
  using (assigned_to = auth.uid());

drop policy if exists "super_admin can do everything on crm_details" on lead_crm_details;
create policy "super_admin can do everything on crm_details"
  on lead_crm_details for all
  using (is_super_admin())
  with check (is_super_admin());

drop policy if exists "sales_executive can manage crm details for their leads" on lead_crm_details;
create policy "sales_executive can manage crm details for their leads"
  on lead_crm_details for all
  using (
    exists (
      select 1 from meta_leads ml
      where ml.id = meta_lead_id and ml.assigned_to = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from meta_leads ml
      where ml.id = meta_lead_id and ml.assigned_to = auth.uid()
    )
  );
