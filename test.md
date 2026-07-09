## Table `user_profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  Nullable |
| `full_name` | `text` |  Nullable |
| `email` | `text` |  Nullable Unique |
| `phone` | `text` |  Nullable |
| `role` | `user_role` |  |
| `password_hash` | `text` |  Nullable |
| `avatar_url` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `lead_crm_details`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `lead_id` | `uuid` |  Unique |
| `call_status` | `call_status` |  Nullable |
| `hwc` | `hwc` |  Nullable |
| `follow_up_date` | `timestamptz` |  Nullable |
| `buying_status` | `buying_status` |  Nullable |
| `site_visit_status` | `crm_site_visit_status` |  Nullable |
| `budget_range` | `text` |  Nullable |
| `profession` | `text` |  Nullable |
| `current_city` | `text` |  Nullable |
| `current_area` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  |
| `first_call_date` | `timestamptz` |  Nullable |
| `last_call_date` | `timestamptz` |  Nullable |
| `visit_date` | `timestamptz` |  Nullable |
| `visit_confirmation_date` | `timestamptz` |  Nullable |
| `configuration` | `jsonb` |  Nullable |
| `remarks` | `text` |  Nullable |
| `company_name` | `text` |  Nullable |
| `not_spoken_reason` | `not_spoken_reason` |  Nullable |
| `follow_up_done` | `bool` |  |
| `follow_up_remarks` | `text` |  Nullable |
| `project_name` | `text` |  Nullable |

## Table `lead_interactions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `lead_id` | `uuid` |  |
| `employee_id` | `uuid` |  Nullable |
| `type` | `text` |  |
| `outcome` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `duration` | `int4` |  Nullable |
| `timestamp` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |

## Table `lead_notes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `lead_id` | `uuid` |  |
| `employee_id` | `uuid` |  Nullable |
| `content` | `text` |  |
| `type` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `leads`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `person_id` | `uuid` |  Nullable |
| `status` | `lead_status` |  |
| `source` | `lead_source` |  |
| `owner_user_id` | `uuid` |  Nullable |
| `project_category` | `text` |  Nullable |
| `ai_score` | `numeric` |  Nullable |
| `whatsapp_status` | `text` |  Nullable |
| `linked_property_id` | `uuid` |  Nullable |
| `last_interaction_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `meta_leads`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `form_id` | `text` |  Nullable |
| `ad_id` | `text` |  Nullable |
| `campaign_name` | `text` |  Nullable |
| `full_name` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `city` | `text` |  Nullable |
| `source` | `text` |  Nullable |
| `status` | `meta_lead_status` |  |
| `form_data` | `jsonb` |  Nullable |
| `client_id` | `text` |  Nullable |
| `assigned_to` | `uuid` |  Nullable |
| `assigned_by` | `uuid` |  Nullable |
| `assigned_at` | `timestamptz` |  Nullable |
| `received_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |
| `external_id` | `text` |  Nullable |
| `page_id` | `text` |  Nullable |
| `page_name` | `text` |  Nullable |

## Table `employee_activities`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  |
| `type` | `text` |  |
| `description` | `text` |  |
| `lead_id` | `uuid` |  Nullable |
| `lead_name` | `text` |  Nullable |
| `duration` | `int4` |  Nullable |
| `outcome` | `text` |  Nullable |
| `timestamp` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |

## Table `employee_goals`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `employee_id` | `uuid` |  |
| `title` | `text` |  |
| `target` | `numeric` |  |
| `current` | `numeric` |  |
| `unit` | `text` |  |
| `period` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `employees`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable Unique |
| `tenant_id` | `uuid` |  |
| `employee_code` | `text` |  Nullable |
| `role` | `text` |  |
| `phone_encrypted` | `text` |  Nullable |
| `status` | `text` |  |
| `target` | `numeric` |  Nullable |
| `join_date` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `properties`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `name` | `text` |  |
| `type` | `property_type` |  |
| `location` | `text` |  |
| `area` | `text` |  Nullable |
| `price` | `numeric` |  |
| `price_per_sqft` | `numeric` |  Nullable |
| `bedrooms` | `int4` |  Nullable |
| `bathrooms` | `int4` |  Nullable |
| `sqft` | `int4` |  Nullable |
| `status` | `property_status` |  |
| `roi` | `numeric` |  Nullable |
| `developer` | `text` |  Nullable |
| `completion_date` | `text` |  Nullable |
| `featured` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `property_amenities`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `property_id` | `uuid` |  |
| `name` | `text` |  |

## Table `property_appreciation`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `property_id` | `uuid` |  |
| `historical_rates` | `jsonb` |  Nullable |
| `projected_rates` | `jsonb` |  Nullable |
| `location_factors` | `jsonb` |  Nullable |
| `investment_score` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `property_images`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `property_id` | `uuid` |  |
| `url` | `text` |  |
| `caption` | `text` |  Nullable |
| `sort_order` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `site_visits`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `lead_id` | `uuid` |  |
| `property_id` | `uuid` |  Nullable |
| `employee_id` | `uuid` |  Nullable |
| `scheduled_date` | `timestamptz` |  |
| `status` | `site_visit_status` |  |
| `feedback` | `text` |  Nullable |
| `rating` | `int4` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |
| `outcome` | `site_visit_outcome` |  Nullable |
| `cancellation_reason` | `text` |  Nullable |
| `follow_up_date` | `timestamptz` |  Nullable |

## Table `bookings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `lead_id` | `uuid` |  |
| `property_id` | `uuid` |  |
| `assigned_to` | `uuid` |  Nullable |
| `amount` | `numeric` |  |
| `commission` | `numeric` |  Nullable |
| `status` | `booking_status` |  |
| `booked_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `conversations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `lead_id` | `uuid` |  |
| `channel` | `text` |  |
| `status` | `text` |  |
| `ai_sentiment` | `jsonb` |  Nullable |
| `last_message_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `conversation_id` | `uuid` |  |
| `sender_id` | `uuid` |  Nullable |
| `sender_type` | `message_sender` |  |
| `type` | `message_type` |  |
| `content` | `text` |  Nullable |
| `status` | `message_status` |  |
| `ai_analysis` | `jsonb` |  Nullable |
| `sent_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |

## Table `clients`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `full_name` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `status_note` | `text` |  Nullable |
| `status_updated_by` | `uuid` |  Nullable |
| `status_updated_at` | `timestamptz` |  Nullable |
| `tier` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `lead_assignment_history`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `lead_id` | `uuid` |  Nullable |
| `from_user` | `uuid` |  Nullable |
| `to_user` | `uuid` |  Nullable |
| `reason` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `meta_lead_sync_state`

Discovered Meta Lead Ads forms and their durable Bulk Read watermarks.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `form_id` | `text` | Primary |
| `page_id` | `text` |  |
| `form_name` | `text` |  Nullable |
| `status` | `text` |  |
| `last_seen_at` | `timestamptz` |  |
| `last_successful_created_at` | `timestamptz` |  Nullable |
| `last_successful_sync_at` | `timestamptz` |  Nullable |
| `backfill_since` | `timestamptz` |  |
| `backfill_after_cursor` | `text` |  Nullable |
| `backfill_completed_at` | `timestamptz` |  Nullable |
| `supports_time_filtering` | `bool` |  Nullable |
| `last_error` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `integration_sync_locks`

Expiring cross-instance leases for serverless integration jobs.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `key` | `text` | Primary |
| `owner_id` | `text` |  |
| `locked_until` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `lead_activity_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `lead_id` | `uuid` |  |
| `actor_user_id` | `uuid` |  Nullable |
| `actor_name` | `text` |  Nullable |
| `event_type` | `lead_activity_event_type` |  |
| `source` | `text` |  |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `from_user_id` | `uuid` |  Nullable |
| `from_user_name` | `text` |  Nullable |
| `to_user_id` | `uuid` |  Nullable |
| `to_user_name` | `text` |  Nullable |
| `changes` | `jsonb` |  Nullable |
| `metadata` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `voice_call_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `lead_id` | `uuid` |  |
| `call_id` | `text` |  |
| `exotel_call_sid` | `text` |  Nullable |
| `campaign_id` | `text` |  Nullable |
| `campaign_name` | `text` |  Nullable |
| `direction` | `voice_direction` |  |
| `status` | `text` |  Nullable |
| `hangup_cause` | `text` |  Nullable |
| `locale` | `voice_locale` |  Nullable |
| `from_number` | `text` |  Nullable |
| `to_number` | `text` |  Nullable |
| `phone_e164` | `text` |  Nullable |
| `queued_at` | `timestamptz` |  Nullable |
| `initiated_at` | `timestamptz` |  Nullable |
| `answered_at` | `timestamptz` |  Nullable |
| `ended_at` | `timestamptz` |  Nullable |
| `duration_sec` | `int4` |  Nullable |
| `recording_url` | `text` |  Nullable |
| `transfer_target` | `text` |  Nullable |
| `reviewed` | `bool` |  |
| `dnc` | `bool` |  |
| `consent_to_recording` | `bool` |  Nullable |
| `disposition` | `text` |  Nullable |
| `next_action_at` | `timestamptz` |  Nullable |
| `raw_payload` | `jsonb` |  Nullable |
| `received_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `voice_transcript_turns`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `call_log_id` | `uuid` |  |
| `turn_index` | `int4` |  |
| `role` | `voice_transcript_role` |  |
| `text` | `text` |  |
| `locale` | `voice_locale` |  Nullable |
| `stt_ms` | `int4` |  Nullable |
| `llm_ms` | `int4` |  Nullable |
| `tts_ms` | `int4` |  Nullable |
| `tokens_prompt` | `int4` |  Nullable |
| `tokens_completion` | `int4` |  Nullable |
| `guardrail_flags` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `voice_lead_scores`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `lead_id` | `uuid` |  |
| `call_log_id` | `uuid` |  |
| `score` | `int4` |  |
| `label_ai` | `voice_lead_label` |  |
| `timeline` | `voice_timeline` |  |
| `rationale` | `text` |  Nullable |
| `signals_positive` | `jsonb` |  Nullable |
| `signals_negative` | `jsonb` |  Nullable |
| `source` | `voice_score_source` |  |
| `scored_at` | `timestamptz` |  Nullable |
| `label_override` | `voice_lead_label` |  Nullable |
| `override_reason` | `text` |  Nullable |
| `override_by` | `uuid` |  Nullable |
| `override_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `voice_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `event_id` | `text` |  |
| `call_id` | `text` |  |
| `lead_id` | `uuid` |  Nullable |
| `type` | `voice_event_type` |  |
| `at` | `timestamptz` |  |
| `detail` | `jsonb` |  Nullable |
| `read` | `bool` |  |
| `idempotency_key` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `voice_sync_audit_log`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `idempotency_key` | `text` |  |
| `endpoint` | `text` |  |
| `request_id` | `text` |  Nullable |
| `raw_payload` | `jsonb` |  Nullable |
| `response_body` | `jsonb` |  Nullable |
| `result_status` | `voice_audit_status` |  |
| `http_status` | `int4` |  |
| `error_code` | `text` |  Nullable |
| `error_message` | `text` |  Nullable |
| `received_at` | `timestamptz` |  |

## Table `analytics_daily_snapshots`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `snapshot_date` | `date` |  |
| `scope_type` | `text` |  |
| `scope_id` | `text` |  |
| `metrics` | `jsonb` |  |
| `generated_at` | `timestamptz` |  |

