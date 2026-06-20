import {
  pgTable, uuid, text, timestamp, jsonb, boolean, integer, numeric, pgEnum, index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { userProfiles } from './users'
import { properties } from './properties'
import { employees } from './employees'

export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost'])
export const leadSourceEnum = pgEnum('lead_source', ['meta_ads', 'google_ads', 'referral', 'website', 'whatsapp', 'walk_in', 'manual'])
export const metaLeadStatusEnum = pgEnum('meta_lead_status', ['unassigned', 'assigned', 'converted', 'rejected', 'cold_pool'])
export const callStatusEnum = pgEnum('call_status', ['spoken', 'not_spoken', 'call_back_later'])
export const hwcEnum = pgEnum('hwc', ['hot', 'warm', 'cold'])
export const buyingStatusEnum = pgEnum('buying_status', ['ready', 'exploring', 'not_ready', 'interested'])
export const notSpokenReasonEnum = pgEnum('not_spoken_reason', ['customer_busy', 'wrong_number', 'out_of_reach', 'did_not_pickup'])
export const crmSiteVisitStatusEnum = pgEnum('crm_site_visit_status', ['scheduled', 'completed', 'not_scheduled'])

// Raw leads from Meta Ads webhook
export const metaLeads = pgTable('meta_leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: text('form_id'),
  adId: text('ad_id'),
  campaignName: text('campaign_name'),
  fullName: text('full_name'),
  phone: text('phone'),
  email: text('email'),
  city: text('city'),
  source: text('source').default('meta_ads'),
  status: metaLeadStatusEnum('status').default('unassigned').notNull(),
  formData: jsonb('form_data'),
  clientId: text('client_id'),
  assignedTo: uuid('assigned_to').references(() => userProfiles.id, { onDelete: 'set null' }),
  assignedBy: uuid('assigned_by').references(() => userProfiles.id, { onDelete: 'set null' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  // Sales execs filter by assignee; the list orders by received_at over live rows.
  index('meta_leads_assigned_to_idx').on(t.assignedTo),
  index('meta_leads_client_id_idx').on(t.clientId),
  index('meta_leads_phone_idx').on(t.phone),
  index('meta_leads_deleted_received_idx').on(t.deletedAt, t.receivedAt),
])

// CRM details attached to a meta_lead after assignment
export const leadCrmDetails = pgTable('lead_crm_details', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => metaLeads.id).notNull().unique(),
  callStatus: callStatusEnum('call_status'),
  notSpokenReason: notSpokenReasonEnum('not_spoken_reason'),
  firstCallDate: timestamp('first_call_date', { withTimezone: true }),
  lastCallDate: timestamp('last_call_date', { withTimezone: true }),
  hwc: hwcEnum('hwc'),
  followUpDate: timestamp('follow_up_date', { withTimezone: true }),
  followUpDone: boolean('follow_up_done').default(false).notNull(),
  followUpRemarks: text('follow_up_remarks'),
  buyingStatus: buyingStatusEnum('buying_status'),
  siteVisitStatus: crmSiteVisitStatusEnum('site_visit_status'),
  visitDate: timestamp('visit_date', { withTimezone: true }),
  visitConfirmationDate: timestamp('visit_confirmation_date', { withTimezone: true }),
  projectName: text('project_name'),
  budgetRange: text('budget_range'),
  configuration: jsonb('configuration').$type<string[]>(),
  profession: text('profession'),
  companyName: text('company_name'),
  currentCity: text('current_city'),
  currentArea: text('current_area'),
  remarks: text('remarks'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Full CRM leads (converted from meta_leads or created directly)
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  personId: uuid('person_id'),
  status: leadStatusEnum('status').default('new').notNull(),
  source: leadSourceEnum('source').notNull(),
  ownerUserId: uuid('owner_user_id').references(() => userProfiles.id, { onDelete: 'set null' }),
  projectCategory: text('project_category'),
  aiScore: numeric('ai_score', { precision: 5, scale: 2 }),
  whatsappStatus: text('whatsapp_status'),
  linkedPropertyId: uuid('linked_property_id').references(() => properties.id),
  lastInteractionAt: timestamp('last_interaction_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const leadNotes = pgTable('lead_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => metaLeads.id).notNull(),
  employeeId: uuid('employee_id').references(() => userProfiles.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  type: text('type').default('general'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('lead_notes_lead_id_idx').on(t.leadId),
])

export const leadInteractions = pgTable('lead_interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => metaLeads.id).notNull(),
  employeeId: uuid('employee_id').references(() => userProfiles.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  outcome: text('outcome'),
  notes: text('notes'),
  duration: integer('duration'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('lead_interactions_lead_id_idx').on(t.leadId),
])

// ── Relations ─────────────────────────────────────────────────────────────────

export const metaLeadsRelations = relations(metaLeads, ({ one, many }) => ({
  assignedToProfile: one(userProfiles, { fields: [metaLeads.assignedTo], references: [userProfiles.id], relationName: 'assigned_to' }),
  assignedByProfile: one(userProfiles, { fields: [metaLeads.assignedBy], references: [userProfiles.id], relationName: 'assigned_by' }),
  crmDetails: one(leadCrmDetails, { fields: [metaLeads.id], references: [leadCrmDetails.leadId] }),
  notes: many(leadNotes),
  interactions: many(leadInteractions),
}))

export const leadCrmDetailsRelations = relations(leadCrmDetails, ({ one }) => ({
  metaLead: one(metaLeads, { fields: [leadCrmDetails.leadId], references: [metaLeads.id] }),
}))

export const leadNotesRelations = relations(leadNotes, ({ one }) => ({
  metaLead: one(metaLeads, { fields: [leadNotes.leadId], references: [metaLeads.id] }),
  employee: one(userProfiles, { fields: [leadNotes.employeeId], references: [userProfiles.id] }),
}))

export const leadInteractionsRelations = relations(leadInteractions, ({ one }) => ({
  metaLead: one(metaLeads, { fields: [leadInteractions.leadId], references: [metaLeads.id] }),
  employee: one(userProfiles, { fields: [leadInteractions.employeeId], references: [userProfiles.id] }),
}))
