import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { metaLeads } from './leads'

/**
 * Durable progress for Meta Lead Ads bulk reads. A row is also the discovered
 * form registry, so newly-created forms can be picked up without code changes.
 */
export const metaLeadSyncState = pgTable('meta_lead_sync_state', {
  formId: text('form_id').primaryKey(),
  pageId: text('page_id').notNull(),
  formName: text('form_name'),
  status: text('status').default('UNKNOWN').notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  lastSuccessfulCreatedAt: timestamp('last_successful_created_at', { withTimezone: true }),
  lastSuccessfulSyncAt: timestamp('last_successful_sync_at', { withTimezone: true }),
  backfillSince: timestamp('backfill_since', { withTimezone: true }).notNull(),
  backfillAfterCursor: text('backfill_after_cursor'),
  backfillCompletedAt: timestamp('backfill_completed_at', { withTimezone: true }),
  supportsTimeFiltering: boolean('supports_time_filtering'),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * Cross-instance lease for serverless integration jobs. owner_id prevents an
 * expired worker from releasing a lease acquired by a newer invocation.
 */
export const integrationSyncLocks = pgTable('integration_sync_locks', {
  key: text('key').primaryKey(),
  ownerId: text('owner_id').notNull(),
  lockedUntil: timestamp('locked_until', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * Durable, idempotent CRM feedback waiting to be delivered to Meta CAPI.
 * No access tokens or raw customer identifiers are stored here.
 */
export const metaConversionOutbox = pgTable('meta_conversion_outbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => metaLeads.id, { onDelete: 'cascade' }).notNull(),
  eventName: text('event_name').notNull(),
  clientStatus: text('client_status').notNull(),
  eventTime: timestamp('event_time', { withTimezone: true }).notNull(),
  status: text('status').default('pending').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  metaTraceId: text('meta_trace_id'),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('meta_conversion_outbox_lead_event_uidx').on(t.leadId, t.eventName),
  index('meta_conversion_outbox_delivery_idx').on(t.status, t.nextAttemptAt),
])
