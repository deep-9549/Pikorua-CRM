import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', ['super_admin', 'admin', 'sales_executive', 'viewer'])

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  fullName: text('full_name'),
  email: text('email').unique(),
  phone: text('phone'),
  role: userRoleEnum('role').default('sales_executive').notNull(),
  passwordHash: text('password_hash'),
  avatarUrl: text('avatar_url'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})
