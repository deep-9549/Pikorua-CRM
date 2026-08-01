-- Adds manual lead origin tracking without changing existing lead behavior.
-- Existing leads are treated as Meta ad leads by the default value.
alter table meta_leads
  add column if not exists source text not null default 'meta_ad'
  check (source in ('meta_ad', 'manual'));
