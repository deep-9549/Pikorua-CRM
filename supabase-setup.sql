-- ============================================================
-- Pikorua CRM — Phase 1 Supabase Setup
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. User profiles (extends Supabase auth.users)
create table if not exists user_profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  phone text,
  role text not null check (role in ('super_admin', 'sales_executive')),
  created_at timestamptz default now()
);

-- Auto-create a profile row when a new auth user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into user_profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'New User'), 'sales_executive');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- 2. Meta leads (raw leads from Facebook/Instagram lead gen forms)
create table if not exists meta_leads (
  id uuid primary key default gen_random_uuid(),
  form_id text,
  ad_id text,
  campaign_name text,
  full_name text,
  phone text,
  email text,
  city text,
  form_data jsonb,
  status text default 'unassigned' check (status in ('unassigned', 'assigned')),
  received_at timestamptz default now(),
  assigned_to uuid references user_profiles(id),
  assigned_at timestamptz,
  assigned_by uuid references user_profiles(id)
);

create index if not exists idx_meta_leads_status_received on meta_leads (status, received_at desc);
create index if not exists idx_meta_leads_assigned_to on meta_leads (assigned_to);


-- 3. CRM details (filled by sales executives per lead)
create table if not exists lead_crm_details (
  id uuid primary key default gen_random_uuid(),
  meta_lead_id uuid references meta_leads(id) on delete cascade unique,
  updated_by uuid references user_profiles(id),
  first_call_date date,
  last_call_date date,
  call_status text check (call_status in ('spoken', 'not_spoken', 'call_back_later')),
  site_visit_status text check (site_visit_status in ('visited', 'yet_to_visit', 'visit_week_confirmed', 'visit_date_confirmed')),
  visit_date date,
  visit_confirmation_date date,
  buying_status text check (buying_status in ('still_searching', 'postponed', 'bought', 'not_interested')),
  budget_range text,
  configuration text[],
  follow_up_date date,
  hwc text check (hwc in ('hot', 'warm', 'cold')),
  remarks text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table user_profiles enable row level security;
alter table meta_leads enable row level security;
alter table lead_crm_details enable row level security;

-- user_profiles: each user sees their own row; super_admin sees all
create policy "users can view own profile"
  on user_profiles for select
  using (auth.uid() = id);

create policy "super_admin can view all profiles"
  on user_profiles for select
  using (
    exists (
      select 1 from user_profiles p
      where p.id = auth.uid() and p.role = 'super_admin'
    )
  );

create policy "super_admin can update all profiles"
  on user_profiles for update
  using (
    exists (
      select 1 from user_profiles p
      where p.id = auth.uid() and p.role = 'super_admin'
    )
  );

-- meta_leads: super_admin sees all; sales_executive sees only their assigned leads
create policy "super_admin can do everything on meta_leads"
  on meta_leads for all
  using (
    exists (
      select 1 from user_profiles p
      where p.id = auth.uid() and p.role = 'super_admin'
    )
  );

create policy "sales_executive can view assigned leads"
  on meta_leads for select
  using (assigned_to = auth.uid());

-- lead_crm_details: tied to meta_leads access
create policy "super_admin can do everything on crm_details"
  on lead_crm_details for all
  using (
    exists (
      select 1 from user_profiles p
      where p.id = auth.uid() and p.role = 'super_admin'
    )
  );

create policy "sales_executive can manage crm details for their leads"
  on lead_crm_details for all
  using (
    exists (
      select 1 from meta_leads ml
      where ml.id = meta_lead_id and ml.assigned_to = auth.uid()
    )
  );


-- ============================================================
-- How to create users
-- ============================================================
-- 1. Go to Supabase Dashboard → Authentication → Users → Add user
-- 2. Enter email + password
-- 3. The trigger above auto-creates a user_profiles row with role='sales_executive'
-- 4. To make someone a super_admin, run:
--    UPDATE user_profiles SET role = 'super_admin', full_name = 'Your Name'
--    WHERE id = '<user-uuid-from-auth-dashboard>';
