export interface LeadListFilters {
  clientStatus: string
  callStatus: string
  campaign: string
  source: string
  assignedTo: string
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
  assigned_to_profile?: { id: string } | null
  crm?: { call_status?: string | null } | null
}

export const EMPTY_LEAD_FILTERS: LeadListFilters = {
  clientStatus: "",
  callStatus: "",
  campaign: "",
  source: "",
  assignedTo: "",
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
    if (filters.clientStatus && filters.clientStatus !== "anti_broker" && (lead.client_status ?? "") !== filters.clientStatus) return false
    if (filters.callStatus) {
      const callStatus = lead.crm?.call_status ?? ""
      if (filters.callStatus === "fresh" && callStatus === "spoken") return false
      if (filters.callStatus !== "fresh" && callStatus !== filters.callStatus) return false
    }
    if (filters.campaign && lead.campaign_name?.trim() !== filters.campaign) return false
    if (filters.source && lead.source !== filters.source) return false
    if (filters.assignedTo && lead.assigned_to_profile?.id !== filters.assignedTo) return false
    if (filters.dateFrom && lead.received_at < filters.dateFrom) return false
    if (filters.dateTo && lead.received_at > `${filters.dateTo}T23:59:59`) return false
    return true
  })
}
