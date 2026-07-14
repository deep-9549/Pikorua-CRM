BEGIN;

CREATE TABLE IF NOT EXISTS lead_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES meta_leads(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  call_status text CHECK (call_status IN ('spoken', 'not_spoken')),
  notes text,
  outcome_remarks text,
  completed_at timestamptz,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  completed_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_follow_ups_lead_scheduled_idx
  ON lead_follow_ups (lead_id, scheduled_at);
CREATE INDEX IF NOT EXISTS lead_follow_ups_status_scheduled_idx
  ON lead_follow_ups (status, scheduled_at);

-- Preserve every currently scheduled reminder as the first timeline entry.
INSERT INTO lead_follow_ups (lead_id, scheduled_at, status, created_at, updated_at)
SELECT lead_id, follow_up_date, 'scheduled', updated_at, updated_at
FROM lead_crm_details crm
WHERE follow_up_date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lead_follow_ups history
    WHERE history.lead_id = crm.lead_id
      AND history.status = 'scheduled'
      AND history.scheduled_at = crm.follow_up_date
  );

-- The old form only exposed remarks after "Follow-up done" was selected, so
-- retain the last known outcome as a completed historical entry.
INSERT INTO lead_follow_ups (
  lead_id, scheduled_at, status, outcome_remarks, completed_at, created_at, updated_at
)
SELECT lead_id, updated_at, 'completed', follow_up_remarks, updated_at, updated_at, updated_at
FROM lead_crm_details crm
WHERE NULLIF(BTRIM(follow_up_remarks), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lead_follow_ups history
    WHERE history.lead_id = crm.lead_id
      AND history.status = 'completed'
      AND history.completed_at = crm.updated_at
      AND history.outcome_remarks = crm.follow_up_remarks
  );

COMMIT;
