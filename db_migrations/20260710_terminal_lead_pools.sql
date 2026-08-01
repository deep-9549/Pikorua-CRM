-- Step 1: add terminal lead-pool statuses.
-- Run this file first and let it complete/commit before running
-- 20260710_terminal_lead_pools_backfill.sql. PostgreSQL does not allow newly
-- added enum values to be used in the same transaction that creates them.

alter type public.meta_lead_status add value if not exists 'lost_pool';
alter type public.meta_lead_status add value if not exists 'not_interested_pool';
alter type public.meta_lead_status add value if not exists 'broker_pool';
alter type public.meta_lead_status add value if not exists 'construction_biz_owner_pool';
