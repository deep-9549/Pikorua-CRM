import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { metaLeads } from './leads'
import { userProfiles } from './users'

export const voiceDirectionEnum = pgEnum('voice_direction', ['inbound', 'outbound'])
export const voiceLocaleEnum = pgEnum('voice_locale', ['hi', 'en', 'gu'])
export const voiceLeadLabelEnum = pgEnum('voice_lead_label', ['hot', 'warm', 'cold'])
export const voiceTimelineEnum = pgEnum('voice_timeline', [
  'immediate',
  'short_term',
  'long_term',
  'exploring',
  'unknown',
])
export const voiceScoreSourceEnum = pgEnum('voice_score_source', ['llm', 'heuristic'])
export const voiceTranscriptRoleEnum = pgEnum('voice_transcript_role', ['caller', 'assistant', 'system'])
export const voiceEventTypeEnum = pgEnum('voice_event_type', [
  'hot_alert',
  'dnc_requested',
  'consultant_transfer',
  'escalation',
  'guardrail_block',
])
export const voiceAuditStatusEnum = pgEnum('voice_audit_status', [
  'ingested',
  'duplicate_ignored',
  'accepted',
  'error',
])

export const voiceCallLogs = pgTable('voice_call_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => metaLeads.id, { onDelete: 'cascade' }).notNull(),
  callId: text('call_id').notNull(),
  exotelCallSid: text('exotel_call_sid'),
  campaignId: text('campaign_id'),
  campaignName: text('campaign_name'),
  direction: voiceDirectionEnum('direction').notNull(),
  status: text('status'),
  hangupCause: text('hangup_cause'),
  locale: voiceLocaleEnum('locale'),
  fromNumber: text('from_number'),
  toNumber: text('to_number'),
  phoneE164: text('phone_e164'),
  queuedAt: timestamp('queued_at', { withTimezone: true }),
  initiatedAt: timestamp('initiated_at', { withTimezone: true }),
  answeredAt: timestamp('answered_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  durationSec: integer('duration_sec'),
  recordingUrl: text('recording_url'),
  transferTarget: text('transfer_target'),
  reviewed: boolean('reviewed').default(false).notNull(),
  dnc: boolean('dnc').default(false).notNull(),
  consentToRecording: boolean('consent_to_recording'),
  disposition: text('disposition'),
  nextActionAt: timestamp('next_action_at', { withTimezone: true }),
  rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>(),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('voice_call_logs_call_id_uidx').on(t.callId),
  index('voice_call_logs_lead_id_idx').on(t.leadId),
  index('voice_call_logs_label_queue_idx').on(t.reviewed, t.receivedAt),
  index('voice_call_logs_phone_idx').on(t.phoneE164),
])

export const voiceTranscriptTurns = pgTable('voice_transcript_turns', {
  id: uuid('id').primaryKey().defaultRandom(),
  callLogId: uuid('call_log_id').references(() => voiceCallLogs.id, { onDelete: 'cascade' }).notNull(),
  turnIndex: integer('turn_index').notNull(),
  role: voiceTranscriptRoleEnum('role').notNull(),
  text: text('text').notNull(),
  locale: voiceLocaleEnum('locale'),
  sttMs: integer('stt_ms'),
  llmMs: integer('llm_ms'),
  ttsMs: integer('tts_ms'),
  tokensPrompt: integer('tokens_prompt'),
  tokensCompletion: integer('tokens_completion'),
  guardrailFlags: jsonb('guardrail_flags').$type<string[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('voice_transcript_turns_order_uidx').on(t.callLogId, t.turnIndex),
  index('voice_transcript_turns_call_log_idx').on(t.callLogId),
])

export const voiceLeadScores = pgTable('voice_lead_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => metaLeads.id, { onDelete: 'cascade' }).notNull(),
  callLogId: uuid('call_log_id').references(() => voiceCallLogs.id, { onDelete: 'cascade' }).notNull(),
  score: integer('score').notNull(),
  labelAi: voiceLeadLabelEnum('label_ai').notNull(),
  timeline: voiceTimelineEnum('timeline').default('unknown').notNull(),
  rationale: text('rationale'),
  signalsPositive: jsonb('signals_positive').$type<string[]>(),
  signalsNegative: jsonb('signals_negative').$type<string[]>(),
  source: voiceScoreSourceEnum('source').default('heuristic').notNull(),
  scoredAt: timestamp('scored_at', { withTimezone: true }),
  labelOverride: voiceLeadLabelEnum('label_override'),
  overrideReason: text('override_reason'),
  overrideBy: uuid('override_by').references(() => userProfiles.id, { onDelete: 'set null' }),
  overrideAt: timestamp('override_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('voice_lead_scores_lead_idx').on(t.leadId),
  index('voice_lead_scores_call_log_idx').on(t.callLogId),
  index('voice_lead_scores_queue_idx').on(t.labelAi, t.timeline, t.score),
])

export const voiceEvents = pgTable('voice_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: text('event_id').notNull(),
  callId: text('call_id').notNull(),
  leadId: uuid('lead_id').references(() => metaLeads.id, { onDelete: 'cascade' }),
  type: voiceEventTypeEnum('type').notNull(),
  at: timestamp('at', { withTimezone: true }).notNull(),
  detail: jsonb('detail').$type<Record<string, unknown>>(),
  read: boolean('read').default(false).notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('voice_events_event_id_uidx').on(t.eventId),
  uniqueIndex('voice_events_idempotency_key_uidx').on(t.idempotencyKey),
  index('voice_events_lead_idx').on(t.leadId),
  index('voice_events_alert_idx').on(t.type, t.read, t.createdAt),
])

export const voiceSyncAuditLog = pgTable('voice_sync_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  idempotencyKey: text('idempotency_key').notNull(),
  endpoint: text('endpoint').notNull(),
  requestId: text('request_id'),
  rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>(),
  responseBody: jsonb('response_body').$type<Record<string, unknown>>(),
  resultStatus: voiceAuditStatusEnum('result_status').notNull(),
  httpStatus: integer('http_status').notNull(),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('voice_sync_audit_idempotency_uidx').on(t.idempotencyKey),
  index('voice_sync_audit_endpoint_idx').on(t.endpoint, t.receivedAt),
])

export const voiceCallLogsRelations = relations(voiceCallLogs, ({ one, many }) => ({
  lead: one(metaLeads, { fields: [voiceCallLogs.leadId], references: [metaLeads.id] }),
  transcriptTurns: many(voiceTranscriptTurns),
  scores: many(voiceLeadScores),
}))

export const voiceTranscriptTurnsRelations = relations(voiceTranscriptTurns, ({ one }) => ({
  callLog: one(voiceCallLogs, { fields: [voiceTranscriptTurns.callLogId], references: [voiceCallLogs.id] }),
}))

export const voiceLeadScoresRelations = relations(voiceLeadScores, ({ one }) => ({
  lead: one(metaLeads, { fields: [voiceLeadScores.leadId], references: [metaLeads.id] }),
  callLog: one(voiceCallLogs, { fields: [voiceLeadScores.callLogId], references: [voiceCallLogs.id] }),
  overrideByProfile: one(userProfiles, { fields: [voiceLeadScores.overrideBy], references: [userProfiles.id] }),
}))

export const voiceEventsRelations = relations(voiceEvents, ({ one }) => ({
  lead: one(metaLeads, { fields: [voiceEvents.leadId], references: [metaLeads.id] }),
}))
