import { pgTable, uuid, text, timestamp, integer, pgEnum, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { metaLeads } from './leads'
import { properties } from './properties'
import { userProfiles } from './users'

export const siteVisitStatusEnum = pgEnum('site_visit_status', ['scheduled', 'completed', 'cancelled', 'no_show'])

export const siteVisits = pgTable('site_visits', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  leadId: uuid('lead_id').references(() => metaLeads.id).notNull(),
  propertyId: uuid('property_id').references(() => properties.id),
  employeeId: uuid('employee_id').references(() => userProfiles.id, { onDelete: 'set null' }),
  scheduledDate: timestamp('scheduled_date', { withTimezone: true }).notNull(),
  status: siteVisitStatusEnum('status').default('scheduled').notNull(),
  feedback: text('feedback'),
  rating: integer('rating'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  // The list filters by status and orders by scheduled_date; lead is joined.
  index('site_visits_status_idx').on(t.status),
  index('site_visits_scheduled_date_idx').on(t.scheduledDate),
  index('site_visits_lead_id_idx').on(t.leadId),
])

// ── Relations ─────────────────────────────────────────────────────────────────

export const siteVisitsRelations = relations(siteVisits, ({ one }) => ({
  lead: one(metaLeads, { fields: [siteVisits.leadId], references: [metaLeads.id] }),
  property: one(properties, { fields: [siteVisits.propertyId], references: [properties.id] }),
  employee: one(userProfiles, { fields: [siteVisits.employeeId], references: [userProfiles.id] }),
}))
