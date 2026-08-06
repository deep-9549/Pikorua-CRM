export type MetaAdsQueueStatus = "assigned" | "unassigned"
export type MetaAdsCallStatus = "spoken" | "not_spoken" | "call_back_later"

export interface MetaAdsQueueFilterableLead {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  campaign_name: string | null
  platform: "instagram" | "facebook" | null
  source: "meta_ad" | "website" | "microsite" | "manual" | "migrated"
  status: MetaAdsQueueStatus
  received_at: string
  assigned_to_profile: { id: string } | null
  crm: { call_status: MetaAdsCallStatus | null } | null
}

export interface MetaAdsQueueFilters {
  search: string
  source: string
  platform: string
  campaign: string
  executive: string
  callStatus: string
  receivedDateFrom: string
  receivedDateTo: string
  queueStatus: "" | MetaAdsQueueStatus
}

export const EMPTY_META_ADS_QUEUE_FILTERS: MetaAdsQueueFilters = {
  search: "",
  source: "",
  platform: "",
  campaign: "",
  executive: "",
  callStatus: "",
  receivedDateFrom: "",
  receivedDateTo: "",
  queueStatus: "",
}

function toDateInputValue(dateStr: string) {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ""

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function filterMetaAdsQueueLeads<T extends MetaAdsQueueFilterableLead>(
  leads: readonly T[],
  filters: MetaAdsQueueFilters,
): T[] {
  const query = filters.search.toLowerCase()

  return leads.filter(lead => {
    if (filters.queueStatus && lead.status !== filters.queueStatus) return false

    if (query) {
      const hit = lead.full_name?.toLowerCase().includes(query)
        || lead.phone?.toLowerCase().includes(query)
        || lead.email?.toLowerCase().includes(query)
        || lead.city?.toLowerCase().includes(query)
        || lead.campaign_name?.toLowerCase().includes(query)
      if (!hit) return false
    }

    if (filters.source && lead.source !== filters.source) return false
    if (filters.platform && lead.platform !== filters.platform) return false
    if (filters.campaign && lead.campaign_name !== filters.campaign) return false
    if (filters.executive && lead.assigned_to_profile?.id !== filters.executive) return false
    if (filters.callStatus && lead.crm?.call_status !== filters.callStatus) return false

    const receivedDate = toDateInputValue(lead.received_at)
    if ((filters.receivedDateFrom || filters.receivedDateTo) && !receivedDate) return false
    if (filters.receivedDateFrom && receivedDate < filters.receivedDateFrom) return false
    if (filters.receivedDateTo && receivedDate > filters.receivedDateTo) return false

    return true
  })
}

export function metaAdsQueueLeadIds(leads: readonly Pick<MetaAdsQueueFilterableLead, "id">[]) {
  return leads.map(lead => lead.id)
}

export function matchingSelectedMetaAdsQueueLeadIds(
  leads: readonly Pick<MetaAdsQueueFilterableLead, "id">[],
  selectedIds: Iterable<string>,
) {
  const matchingIds = new Set(metaAdsQueueLeadIds(leads))
  return Array.from(selectedIds).filter(id => matchingIds.has(id))
}
