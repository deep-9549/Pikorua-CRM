import { dateKey } from './lead-display-order'

export interface FilterableSiteVisit {
  site_visit_status: string
  visit_date: string | null
  visit_confirmation_date: string | null
  status: string
  outcome: string | null
  scheduled_by_profile: { id: string; full_name: string } | null
  lead: {
    full_name: string | null
    phone: string | null
    email: string | null
    crm?: { project_name?: string | null } | null
  }
}

export type SiteVisitTiming = "" | "today" | "tomorrow" | "this_week" | "overdue"

export interface SiteVisitFilters {
  status: string
  outcome: string
  /** scheduled_by_profile.id — only offered to super admins. */
  employee: string
  project: string
  timing: SiteVisitTiming
  /** Single calendar day (YYYY-MM-DD) the visit is scheduled for. */
  dateOn: string
  dateFrom: string
  dateTo: string
}

export const EMPTY_SITE_VISIT_FILTERS: SiteVisitFilters = {
  status: "",
  outcome: "",
  employee: "",
  project: "",
  timing: "",
  dateOn: "",
  dateFrom: "",
  dateTo: "",
}

/** The visit's effective date: the visited date, else the confirmed date. */
export function visitDate(visit: FilterableSiteVisit) {
  return visit.visit_date ?? visit.visit_confirmation_date
}

/** A confirmed visit whose slot has already passed without an outcome. */
export function isOverdue(visit: FilterableSiteVisit, now = Date.now()) {
  if (visit.site_visit_status !== "visit_date_confirmed") return false
  const date = visitDate(visit)
  if (!date) return false
  const time = new Date(date).getTime()
  return !Number.isNaN(time) && time < now
}

export function isToday(iso: string | null, now = Date.now()) {
  if (!iso) return false
  const key = dateKey(iso)
  return key !== "" && key === dateKey(new Date(now))
}

function addDays(now: number, days: number) {
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  return date
}

function matchesTiming(visit: FilterableSiteVisit, timing: SiteVisitTiming, now: number) {
  if (!timing) return true
  if (timing === "overdue") return isOverdue(visit, now)

  const key = dateKey(visitDate(visit))
  if (!key) return false
  if (timing === "today") return key === dateKey(new Date(now))
  if (timing === "tomorrow") return key === dateKey(addDays(now, 1))
  // this_week: today through the next six days inclusive.
  return key >= dateKey(new Date(now)) && key <= dateKey(addDays(now, 6))
}

export function projectOptions(visits: readonly FilterableSiteVisit[]) {
  return Array.from(new Set(
    visits
      .map(visit => visit.lead.crm?.project_name?.trim())
      .filter((project): project is string => Boolean(project)),
  )).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
}

export function employeeOptions(visits: readonly FilterableSiteVisit[]) {
  const byId = new Map<string, string>()
  visits.forEach(visit => {
    const profile = visit.scheduled_by_profile
    if (profile) byId.set(profile.id, profile.full_name)
  })
  return Array.from(byId, ([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
}

export function filterSiteVisits<T extends FilterableSiteVisit>(
  visits: readonly T[],
  search: string,
  filters: SiteVisitFilters,
  now = Date.now(),
): T[] {
  const query = search.trim().toLowerCase()

  return visits.filter(visit => {
    if (query) {
      const matchesSearch = visit.lead.full_name?.toLowerCase().includes(query)
        || visit.lead.phone?.toLowerCase().includes(query)
        || visit.lead.email?.toLowerCase().includes(query)
        || visit.lead.crm?.project_name?.toLowerCase().includes(query)
        || visit.scheduled_by_profile?.full_name.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }
    if (filters.status && visit.status !== filters.status) return false
    if (filters.outcome && (visit.outcome ?? "") !== filters.outcome) return false
    if (filters.employee && visit.scheduled_by_profile?.id !== filters.employee) return false
    if (filters.project && visit.lead.crm?.project_name?.trim() !== filters.project) return false
    if (!matchesTiming(visit, filters.timing, now)) return false

    // dateKey resolves the stored UTC timestamp to the viewer's calendar day.
    const key = dateKey(visitDate(visit))
    if ((filters.dateOn || filters.dateFrom || filters.dateTo) && !key) return false
    if (filters.dateOn && key !== filters.dateOn) return false
    if (filters.dateFrom && key < filters.dateFrom) return false
    if (filters.dateTo && key > filters.dateTo) return false
    return true
  })
}
