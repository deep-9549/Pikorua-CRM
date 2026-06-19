import { pgTable, uuid, text, timestamp, numeric, pgEnum, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { metaLeads } from './leads'
import { properties } from './properties'
import { userProfiles } from './users'

export const bookingStatusEnum = pgEnum('booking_status', ['confirmed', 'pending', 'cancelled'])

export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  leadId: uuid('lead_id').references(() => metaLeads.id).notNull(),
  propertyId: uuid('property_id').references(() => properties.id).notNull(),
  assignedTo: uuid('assigned_to').references(() => userProfiles.id, { onDelete: 'set null' }),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  commission: numeric('commission', { precision: 15, scale: 2 }),
  status: bookingStatusEnum('status').default('pending').notNull(),
  bookedAt: timestamp('booked_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  // The list filters by status; lead/property are joined when loading relations.
  index('bookings_status_idx').on(t.status),
  index('bookings_lead_id_idx').on(t.leadId),
  index('bookings_property_id_idx').on(t.propertyId),
])

// ── Relations ─────────────────────────────────────────────────────────────────

export const bookingsRelations = relations(bookings, ({ one }) => ({
  lead: one(metaLeads, { fields: [bookings.leadId], references: [metaLeads.id] }),
  property: one(properties, { fields: [bookings.propertyId], references: [properties.id] }),
  assignedEmployee: one(userProfiles, { fields: [bookings.assignedTo], references: [userProfiles.id] }),
}))
