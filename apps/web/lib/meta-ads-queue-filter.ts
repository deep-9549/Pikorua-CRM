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
  source: "meta_ad" | "website" | "microsite" | "manual" | "migrated" | "legacy_import"
  legacy_import: boolean
  status: MetaAdsQueueStatus
  received_at: string
  assigned_to_profile: { id: string } | null
  client_status: string | null
  client_construction_business_owner?: boolean
  crm: { call_status: MetaAdsCallStatus | null; budget_range?: string | null } | null
}

export interface MetaAdsQueueFilters {
  search: string
  source: string
  platform: string
  campaign: string
  budget: string
  executive: string
  clientStatus: string
  callStatus: string
  receivedDateFrom: string
  receivedDateTo: string
  queueStatus: "" | MetaAdsQueueStatus
  legacyMode: "all" | "exclude" | "only"
}

export const EMPTY_META_ADS_QUEUE_FILTERS: MetaAdsQueueFilters = {
  search: "",
  source: "",
  platform: "",
  campaign: "",
  budget: "",
  executive: "",
  clientStatus: "",
  callStatus: "",
  receivedDateFrom: "",
  receivedDateTo: "",
  queueStatus: "",
  legacyMode: "all",
}

export function metaAdsBudgetOptions(leads: readonly MetaAdsQueueFilterableLead[]) {
  void leads
  return [...BUDGET_BUCKETS]
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
    if (filters.legacyMode === "exclude" && lead.legacy_import) return false
    if (filters.legacyMode === "only" && !lead.legacy_import) return false

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
    if (filters.budget && !budgetMatchesBucket(lead.crm?.budget_range, filters.budget)) return false
    if (filters.executive && lead.assigned_to_profile?.id !== filters.executive) return false
    if (
      filters.clientStatus === "construction_business_owner"
        ? !lead.client_construction_business_owner
        : filters.clientStatus && lead.client_status !== filters.clientStatus
    ) return false
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
import { BUDGET_BUCKETS, budgetMatchesBucket } from './budget-buckets'
