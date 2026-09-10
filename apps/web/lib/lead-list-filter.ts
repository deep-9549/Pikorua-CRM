export interface LeadListFilters {
  clientStatus: string
  callStatus: string
  campaign: string
  budget: string
  source: string
  assignedTo: string
  /** Single calendar day (YYYY-MM-DD) the lead was generated on. */
  receivedOn: string
  dateFrom: string
  dateTo: string
}

export interface FilterableLead {
  full_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  campaign_name: string | null
  source: string
  received_at: string
  client_status?: string | null
  client_anti_broker?: boolean
  client_construction_business_owner?: boolean
  assigned_to_profile?: { id: string } | null
  crm?: { call_status?: string | null; budget_range?: string | null } | null
}

export const EMPTY_LEAD_FILTERS: LeadListFilters = {
  clientStatus: "",
  callStatus: "",
  campaign: "",
  budget: "",
  source: "",
  assignedTo: "",
  receivedOn: "",
  dateFrom: "",
  dateTo: "",
}

export function campaignOptions(leads: FilterableLead[]) {
  return Array.from(new Set(
    leads
      .map(lead => lead.campaign_name?.trim())
      .filter((campaign): campaign is string => Boolean(campaign)),
  )).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
}

export function budgetOptions(leads: FilterableLead[]) {
  void leads
  return [...BUDGET_BUCKETS]
}

export function filterLeadList<T extends FilterableLead>(
  leads: T[],
  search: string,
  filters: LeadListFilters,
) {
  const query = search.trim().toLowerCase()

  return leads.filter(lead => {
    if (query) {
      const matchesSearch = lead.full_name?.toLowerCase().includes(query)
        || lead.phone?.toLowerCase().includes(query)
        || lead.email?.toLowerCase().includes(query)
        || lead.city?.toLowerCase().includes(query)
        || lead.campaign_name?.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }
    if (filters.clientStatus === "anti_broker" && !lead.client_anti_broker) return false
    if (filters.clientStatus === "construction_business_owner" && !lead.client_construction_business_owner) return false
    if (
      filters.clientStatus
      && filters.clientStatus !== "anti_broker"
      && filters.clientStatus !== "construction_business_owner"
      && (lead.client_status ?? "") !== filters.clientStatus
    ) return false
    if (filters.callStatus) {
      const callStatus = lead.crm?.call_status ?? ""
      if (filters.callStatus === "fresh" && callStatus === "spoken") return false
      if (filters.callStatus !== "fresh" && callStatus !== filters.callStatus) return false
    }
    if (filters.campaign && lead.campaign_name?.trim() !== filters.campaign) return false
    if (filters.budget && !budgetMatchesBucket(lead.crm?.budget_range, filters.budget)) return false
    if (filters.source && lead.source !== filters.source) return false
    if (filters.assignedTo && lead.assigned_to_profile?.id !== filters.assignedTo) return false
    // dateKey resolves the stored UTC timestamp to the viewer's calendar day,
    // so "generated on the 3rd" means the 3rd in local (IST) time.
    if (filters.receivedOn && dateKey(lead.received_at) !== filters.receivedOn) return false
    if (filters.dateFrom && dateKey(lead.received_at) < filters.dateFrom) return false
    if (filters.dateTo && dateKey(lead.received_at) > filters.dateTo) return false
    return true
  })
}
import { BUDGET_BUCKETS, budgetMatchesBucket } from './budget-buckets'
import { dateKey } from './lead-display-order'
