import { date, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

export const analyticsDailySnapshots = pgTable('analytics_daily_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  snapshotDate: date('snapshot_date').notNull(),
  scopeType: text('scope_type').notNull(),
  scopeId: text('scope_id').default('global').notNull(),
  metrics: jsonb('metrics').$type<Record<string, unknown>>().notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('analytics_daily_snapshots_scope_date_uidx').on(t.snapshotDate, t.scopeType, t.scopeId),
])
