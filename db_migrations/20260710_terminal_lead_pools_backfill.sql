-- Step 2: move existing terminal client-status leads out of the active queue.
-- Run this only after 20260710_terminal_lead_pools.sql has completed.

update public.meta_leads ml
set
  status = case c.status
    when 'lost' then 'lost_pool'::public.meta_lead_status
    when 'not_interested' then 'not_interested_pool'::public.meta_lead_status
    when 'broker' then 'broker_pool'::public.meta_lead_status
    when 'construction_biz_owner' then 'construction_biz_owner_pool'::public.meta_lead_status
    else ml.status
  end,
  updated_at = now()
from public.clients c
where ml.deleted_at is null
  and c.status in ('lost', 'not_interested', 'broker', 'construction_biz_owner')
  and ml.status in (
    'unassigned',
    'assigned',
    'cold_pool',
    'lost_pool',
    'not_interested_pool',
    'broker_pool',
    'construction_biz_owner_pool'
  )
  and (
    ml.client_id = c.id::text
    or (ml.client_id is null and ml.phone is not null and ml.phone = c.phone)
  );
