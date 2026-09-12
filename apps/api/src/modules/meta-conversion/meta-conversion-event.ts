export const META_CAPI_STATUS_EVENTS = {
  warm: 'PikoruaWarmLead',
  hot: 'PikoruaHotLead',
  super_hot: 'PikoruaSuperHotLead',
} as const

export type MetaCapiClientStatus = keyof typeof META_CAPI_STATUS_EVENTS

const STATUS_RANK: Record<MetaCapiClientStatus, number> = {
  warm: 1,
  hot: 2,
  super_hot: 3,
}

export function eventForForwardStatusTransition(
  previousStatus: string | null | undefined,
  nextStatus: string | null | undefined,
) {
  if (!nextStatus || !(nextStatus in META_CAPI_STATUS_EVENTS)) return null

  const next = nextStatus as MetaCapiClientStatus
  const previousRank = previousStatus && previousStatus in STATUS_RANK
    ? STATUS_RANK[previousStatus as MetaCapiClientStatus]
    : 0

  if (STATUS_RANK[next] <= previousRank) return null
  return { clientStatus: next, eventName: META_CAPI_STATUS_EVENTS[next] }
}

export function buildMetaCrmEvent(input: {
  eventId: string
  eventName: string
  eventTime: Date
  metaLeadId: string
}) {
  return {
    event_id: input.eventId,
    event_name: input.eventName,
    event_time: Math.floor(input.eventTime.getTime() / 1000),
    action_source: 'system_generated',
    user_data: {
      lead_id: input.metaLeadId,
    },
    custom_data: {
      event_source: 'crm',
      lead_event_source: 'Pikorua CRM',
    },
  }
}
