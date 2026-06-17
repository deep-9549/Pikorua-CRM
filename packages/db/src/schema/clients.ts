import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
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
}, (t) => [
  // Clients are looked up by phone when linking/serving leads.
  index('clients_phone_idx').on(t.phone),
])

export const clientsRelations = relations(clients, ({ one, many }) => ({
  leads: many(metaLeads),
  statusUpdatedByProfile: one(userProfiles, { fields: [clients.statusUpdatedBy], references: [userProfiles.id] }),
}))
