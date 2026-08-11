export const CLIENT_STATUS_TO_META_LEAD_POOL_STATUS = {
  lost: 'lost_pool',
  not_interested: 'not_interested_pool',
  broker: 'broker_pool',
} as const

export const META_LEAD_POOL_STATUSES = Object.values(CLIENT_STATUS_TO_META_LEAD_POOL_STATUS)

// Retained in the database enum for backward compatibility, but treated as
// normal queue states and normalized by the 20260811 migration.
export const LEGACY_ACTIVE_META_LEAD_POOL_STATUSES = [
  'cold_pool',
  'construction_biz_owner_pool',
] as const

export const NON_TRANSFERABLE_META_LEAD_POOL_STATUSES = [
  'lost_pool',
  'not_interested_pool',
  'broker_pool',
] as const

export const META_LEAD_QUEUE_MANAGED_STATUSES = [
  'unassigned',
  'assigned',
  ...META_LEAD_POOL_STATUSES,
  ...LEGACY_ACTIVE_META_LEAD_POOL_STATUSES,
] as const

export function poolStatusForClientStatus(status: string | null | undefined) {
  if (!status) return null
  return CLIENT_STATUS_TO_META_LEAD_POOL_STATUS[
    status as keyof typeof CLIENT_STATUS_TO_META_LEAD_POOL_STATUS
  ] ?? null
}

export function isMetaLeadPoolStatus(status: string | null | undefined) {
  return Boolean(status && META_LEAD_POOL_STATUSES.includes(status as never))
}

export function isNonTransferableMetaLeadPoolStatus(status: string | null | undefined) {
  return Boolean(status && NON_TRANSFERABLE_META_LEAD_POOL_STATUSES.includes(status as never))
}
