BEGIN;

-- Older CRM installations created this as a date-only column. Convert it only
-- when necessary so rerunning this migration cannot shift existing timestamps.
DO $$
DECLARE
  current_type text;
BEGIN
  SELECT data_type
    INTO current_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'lead_crm_details'
    AND column_name = 'follow_up_date';

  IF current_type = 'date' THEN
    ALTER TABLE public.lead_crm_details
      ALTER COLUMN follow_up_date TYPE timestamptz
      USING (follow_up_date::timestamp AT TIME ZONE 'Asia/Kolkata');
  END IF;
END $$;

COMMIT;
