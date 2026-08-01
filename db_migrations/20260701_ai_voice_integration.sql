-- AI Voice integration tables for the dedicated /ai-voice workspace.
-- The CRM stores Voice-service output and Exotel recording links only; it does
-- not fetch, proxy, download, or store recording audio bytes.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voice_direction') THEN
    CREATE TYPE voice_direction AS ENUM ('inbound', 'outbound');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voice_locale') THEN
    CREATE TYPE voice_locale AS ENUM ('hi', 'en', 'gu');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voice_lead_label') THEN
    CREATE TYPE voice_lead_label AS ENUM ('hot', 'warm', 'cold');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voice_timeline') THEN
    CREATE TYPE voice_timeline AS ENUM ('immediate', 'short_term', 'long_term', 'exploring', 'unknown');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voice_score_source') THEN
    CREATE TYPE voice_score_source AS ENUM ('llm', 'heuristic');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voice_transcript_role') THEN
    CREATE TYPE voice_transcript_role AS ENUM ('caller', 'assistant', 'system');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voice_event_type') THEN
    CREATE TYPE voice_event_type AS ENUM ('hot_alert', 'dnc_requested', 'consultant_transfer', 'escalation', 'guardrail_block');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voice_audit_status') THEN
    CREATE TYPE voice_audit_status AS ENUM ('ingested', 'duplicate_ignored', 'accepted', 'error');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS voice_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES meta_leads(id) ON DELETE CASCADE,
  call_id text NOT NULL,
  exotel_call_sid text,
  campaign_id text,
  campaign_name text,
  direction voice_direction NOT NULL,
  status text,
  hangup_cause text,
  locale voice_locale,
  from_number text,
  to_number text,
  phone_e164 text,
  queued_at timestamptz,
  initiated_at timestamptz,
  answered_at timestamptz,
  ended_at timestamptz,
  duration_sec integer,
  recording_url text,
  transfer_target text,
  reviewed boolean NOT NULL DEFAULT false,
  dnc boolean NOT NULL DEFAULT false,
  consent_to_recording boolean,
  disposition text,
  next_action_at timestamptz,
  raw_payload jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS voice_call_logs_call_id_uidx ON voice_call_logs(call_id);
CREATE INDEX IF NOT EXISTS voice_call_logs_lead_id_idx ON voice_call_logs(lead_id);
CREATE INDEX IF NOT EXISTS voice_call_logs_label_queue_idx ON voice_call_logs(reviewed, received_at);
CREATE INDEX IF NOT EXISTS voice_call_logs_phone_idx ON voice_call_logs(phone_e164);

CREATE TABLE IF NOT EXISTS voice_transcript_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id uuid NOT NULL REFERENCES voice_call_logs(id) ON DELETE CASCADE,
  turn_index integer NOT NULL,
  role voice_transcript_role NOT NULL,
  text text NOT NULL,
  locale voice_locale,
  stt_ms integer,
  llm_ms integer,
  tts_ms integer,
  tokens_prompt integer,
  tokens_completion integer,
  guardrail_flags jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS voice_transcript_turns_order_uidx ON voice_transcript_turns(call_log_id, turn_index);
CREATE INDEX IF NOT EXISTS voice_transcript_turns_call_log_idx ON voice_transcript_turns(call_log_id);

CREATE TABLE IF NOT EXISTS voice_lead_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES meta_leads(id) ON DELETE CASCADE,
  call_log_id uuid NOT NULL REFERENCES voice_call_logs(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  label_ai voice_lead_label NOT NULL,
  timeline voice_timeline NOT NULL DEFAULT 'unknown',
  rationale text,
  signals_positive jsonb,
  signals_negative jsonb,
  source voice_score_source NOT NULL DEFAULT 'heuristic',
  scored_at timestamptz,
  label_override voice_lead_label,
  override_reason text,
  override_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  override_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voice_lead_scores_lead_idx ON voice_lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS voice_lead_scores_call_log_idx ON voice_lead_scores(call_log_id);
CREATE INDEX IF NOT EXISTS voice_lead_scores_queue_idx ON voice_lead_scores(label_ai, timeline, score);

CREATE TABLE IF NOT EXISTS voice_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  call_id text NOT NULL,
  lead_id uuid REFERENCES meta_leads(id) ON DELETE CASCADE,
  type voice_event_type NOT NULL,
  at timestamptz NOT NULL,
  detail jsonb,
  read boolean NOT NULL DEFAULT false,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS voice_events_event_id_uidx ON voice_events(event_id);
CREATE UNIQUE INDEX IF NOT EXISTS voice_events_idempotency_key_uidx ON voice_events(idempotency_key);
CREATE INDEX IF NOT EXISTS voice_events_lead_idx ON voice_events(lead_id);
CREATE INDEX IF NOT EXISTS voice_events_alert_idx ON voice_events(type, read, created_at);

CREATE TABLE IF NOT EXISTS voice_sync_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL,
  endpoint text NOT NULL,
  request_id text,
  raw_payload jsonb,
  response_body jsonb,
  result_status voice_audit_status NOT NULL,
  http_status integer NOT NULL,
  error_code text,
  error_message text,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS voice_sync_audit_idempotency_uidx ON voice_sync_audit_log(idempotency_key);
CREATE INDEX IF NOT EXISTS voice_sync_audit_endpoint_idx ON voice_sync_audit_log(endpoint, received_at);
