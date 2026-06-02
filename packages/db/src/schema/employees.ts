import { pgTable, uuid, text, timestamp, numeric, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { userProfiles } from './users'

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => userProfiles.id).notNull().unique(),
  tenantId: uuid('tenant_id').notNull(),
  employeeCode: text('employee_code'),
  role: text('role').notNull(),
  phoneEncrypted: text('phone_encrypted'),
  status: text('status').default('active').notNull(),
  target: numeric('target', { precision: 15, scale: 2 }).default('0'),
  joinDate: timestamp('join_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const employeeGoals = pgTable('employee_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').references(() => employees.id).notNull(),
  title: text('title').notNull(),
  target: numeric('target', { precision: 15, scale: 2 }).notNull(),
  current: numeric('current', { precision: 15, scale: 2 }).default('0').notNull(),
  unit: text('unit').notNull(),
  period: text('period').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const employeeActivities = pgTable('employee_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').references(() => employees.id).notNull(),
  type: text('type').notNull(),
  description: text('description').notNull(),
  leadId: uuid('lead_id'),
  leadName: text('lead_name'),
  duration: integer('duration'),
  outcome: text('outcome'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── Relations ─────────────────────────────────────────────────────────────────

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(userProfiles, { fields: [employees.userId], references: [userProfiles.id] }),
  goals: many(employeeGoals),
  activities: many(employeeActivities),
}))

export const employeeGoalsRelations = relations(employeeGoals, ({ one }) => ({
  employee: one(employees, { fields: [employeeGoals.employeeId], references: [employees.id] }),
}))

export const employeeActivitiesRelations = relations(employeeActivities, ({ one }) => ({
  employee: one(employees, { fields: [employeeActivities.employeeId], references: [employees.id] }),
}))
