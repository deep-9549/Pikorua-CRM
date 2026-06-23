BEGIN;

-- HWC is now part of client status. This migration copies existing
-- lead_crm_details.hwc values into the linked client row, then clears HWC so
-- the CRM no longer stores the same concept in two places.

-- Create missing client rows for HWC leads that have a phone number.
INSERT INTO public.clients (
  tenant_id,
  full_name,
  phone,
  email,
  status,
  status_updated_at,
  created_at,
  updated_at
)
SELECT DISTINCT ON (ml.phone)
  '00000000-0000-0000-0000-000000000000'::uuid,
  ml.full_name,
  ml.phone,
  ml.email,
  lcd.hwc,
  now(),
  now(),
  now()
FROM public.meta_leads ml
JOIN public.lead_crm_details lcd ON lcd.lead_id = ml.id
WHERE lcd.hwc IN ('hot', 'warm', 'cold')
  AND ml.phone IS NOT NULL
  AND btrim(ml.phone) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.phone = ml.phone
  )
ORDER BY ml.phone, COALESCE(lcd.updated_at, ml.updated_at, ml.received_at) DESC;

-- Link HWC leads to an existing/new client by phone when the lead is not linked.
WITH phone_clients AS (
  SELECT DISTINCT ON (phone)
    id,
    phone
  FROM public.clients
  WHERE phone IS NOT NULL
    AND btrim(phone) <> ''
  ORDER BY phone, created_at ASC
)
UPDATE public.meta_leads ml
SET
  client_id = pc.id::text,
  updated_at = now()
FROM phone_clients pc
WHERE ml.client_id IS NULL
  AND ml.phone = pc.phone
  AND EXISTS (
    SELECT 1
    FROM public.lead_crm_details lcd
    WHERE lcd.lead_id = ml.id
      AND lcd.hwc IN ('hot', 'warm', 'cold')
  );

-- Move the latest HWC value per client into clients.status, without
-- overwriting an already-selected client status such as postponed/lost.
WITH latest_hwc AS (
  SELECT DISTINCT ON (ml.client_id)
    ml.client_id,
    lcd.hwc
  FROM public.meta_leads ml
  JOIN public.lead_crm_details lcd ON lcd.lead_id = ml.id
  WHERE ml.client_id IS NOT NULL
    AND lcd.hwc IN ('hot', 'warm', 'cold')
  ORDER BY ml.client_id, COALESCE(lcd.updated_at, ml.updated_at, ml.received_at) DESC
)
UPDATE public.clients c
SET
  status = latest_hwc.hwc,
  status_updated_at = COALESCE(c.status_updated_at, now()),
  updated_at = now()
FROM latest_hwc
WHERE c.id::text = latest_hwc.client_id
  AND (c.status IS NULL OR c.status = '' OR c.status = 'active');

-- Clear HWC only after the lead is linked to a client, so un-linkable rows do
-- not lose data. The app/export also falls back to legacy HWC until this runs.
UPDATE public.lead_crm_details lcd
SET
  hwc = NULL,
  updated_at = now()
FROM public.meta_leads ml
WHERE lcd.lead_id = ml.id
  AND ml.client_id IS NOT NULL
  AND lcd.hwc IN ('hot', 'warm', 'cold');

COMMIT;
