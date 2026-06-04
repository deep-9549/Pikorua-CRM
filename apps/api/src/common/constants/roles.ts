// The application supports exactly two roles. Keep this the single source of
// truth — DTO validation, guards and services all derive from it.
export const USER_ROLES = ['super_admin', 'sales_executive'] as const

export type UserRole = (typeof USER_ROLES)[number]
