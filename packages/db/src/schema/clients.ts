import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { metaLeads } from './leads'
import { userProfiles } from './users'

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  fullName: text('full_name'),
  phone: text('phone'),
  email: text('email'),
  status: text('status').default('active'),
  statusNote: text('status_note'),
  statusUpdatedBy: uuid('status_updated_by').references(() => userProfiles.id),
  statusUpdatedAt: timestamp('status_updated_at', { withTimezone: true }),
  tier: text('tier').default('standard'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const clientsRelations = relations(clients, ({ many }) => ({
  leads: many(metaLeads),
}))
