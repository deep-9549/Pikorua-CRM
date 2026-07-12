import { relations } from 'drizzle-orm'
import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { userProfiles } from './users'

export const hniProfiles = pgTable('hni_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: text('full_name').notNull(),
  category: text('category').notNull().default('business'),
  designation: text('designation'),
  organisation: text('organisation'),
  city: text('city'),
  country: text('country').default('India'),
  phone: text('phone'),
  email: text('email'),
  assistantName: text('assistant_name'),
  assistantPhone: text('assistant_phone'),
  tier: text('tier').notNull().default('platinum'),
  relationshipStage: text('relationship_stage').notNull().default('prospect'),
  relationshipOwnerId: uuid('relationship_owner_id').references(() => userProfiles.id, { onDelete: 'set null' }),
  estimatedPortfolioValue: numeric('estimated_portfolio_value', { precision: 18, scale: 2 }),
  estimatedBudgetMin: numeric('estimated_budget_min', { precision: 18, scale: 2 }),
  estimatedBudgetMax: numeric('estimated_budget_max', { precision: 18, scale: 2 }),
  propertiesOwned: integer('properties_owned').notNull().default(0),
  preferences: jsonb('preferences').$type<string[]>().notNull().default([]),
  interests: jsonb('interests').$type<string[]>().notNull().default([]),
  communicationPreferences: text('communication_preferences'),
  relationshipNotes: text('relationship_notes'),
  source: text('source'),
  lastContactAt: timestamp('last_contact_at', { withTimezone: true }),
  nextActionAt: timestamp('next_action_at', { withTimezone: true }),
  nextAction: text('next_action'),
  isSensitive: boolean('is_sensitive').notNull().default(true),
  createdBy: uuid('created_by').references(() => userProfiles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('hni_profiles_name_idx').on(t.fullName),
  index('hni_profiles_owner_idx').on(t.relationshipOwnerId),
  index('hni_profiles_next_action_idx').on(t.nextActionAt),
])

export const hniActivities = pgTable('hni_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  hniProfileId: uuid('hni_profile_id').notNull().references(() => hniProfiles.id, { onDelete: 'cascade' }),
  activityType: text('activity_type').notNull(),
  title: text('title').notNull(),
  notes: text('notes'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => userProfiles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('hni_activities_profile_idx').on(t.hniProfileId, t.occurredAt)])

export const hniProfilesRelations = relations(hniProfiles, ({ one, many }) => ({
  owner: one(userProfiles, { fields: [hniProfiles.relationshipOwnerId], references: [userProfiles.id] }),
  activities: many(hniActivities),
}))

export const hniActivitiesRelations = relations(hniActivities, ({ one }) => ({
  profile: one(hniProfiles, { fields: [hniActivities.hniProfileId], references: [hniProfiles.id] }),
  actor: one(userProfiles, { fields: [hniActivities.createdBy], references: [userProfiles.id] }),
}))
