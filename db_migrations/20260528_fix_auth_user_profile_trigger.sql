-- Fix profile creation triggered by Supabase Auth user inserts.
-- Auth-trigger execution must not rely on the caller's search path.
alter table public.user_profiles
  add column if not exists email text;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'New User'), new.email, 'sales_executive');
  return new;
end;
$$ language plpgsql security definer set search_path = public;
