import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

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
