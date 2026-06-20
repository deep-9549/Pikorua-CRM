BEGIN;

ALTER TYPE buying_status ADD VALUE IF NOT EXISTS 'interested';

DO $$ BEGIN
  CREATE TYPE not_spoken_reason AS ENUM ('customer_busy', 'wrong_number', 'out_of_reach', 'did_not_pickup');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE lead_crm_details
  ADD COLUMN IF NOT EXISTS not_spoken_reason not_spoken_reason,
  ADD COLUMN IF NOT EXISTS follow_up_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS follow_up_remarks text,
  ADD COLUMN IF NOT EXISTS project_name text;

DO $$ BEGIN
  CREATE TYPE site_visit_outcome AS ENUM ('visit_done', 'visit_rescheduled', 'visit_cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE site_visits
  ADD COLUMN IF NOT EXISTS outcome site_visit_outcome,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS follow_up_date timestamptz;

CREATE INDEX IF NOT EXISTS site_visits_follow_up_date_idx ON site_visits (follow_up_date);

COMMIT;
