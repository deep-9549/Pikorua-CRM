export interface LeadOrderCrm {
  call_status?: string | null
  follow_up_date?: string | null
}

export interface LeadForDisplayOrder {
  id: string
  received_at?: string | null
  assigned_at?: string | null
  assignment_viewed_at?: string | null
  crm?: LeadOrderCrm | null
}

export interface LeadDisplaySections<T extends LeadForDisplayOrder> {
  dueToday: T[]
  overdue: T[]
  rest: T[]
  ordered: T[]
}

export function dateKey(value: string | Date | null | undefined) {
  if (!value) return ""
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function followUpTimestamp(value: string | null | undefined) {
  if (!value) return Number.NaN
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value
  return new Date(normalized).getTime()
}

/** Epoch ms for a lead's generation date. Missing/unparseable sorts last. */
export function receivedTime(lead: LeadForDisplayOrder) {
  if (!lead.received_at) return 0
  const time = new Date(lead.received_at).getTime()
  return Number.isNaN(time) ? 0 : time
}

/** Newest generated lead first. Use as a comparator or a tiebreaker. */
export function byReceivedDesc(a: LeadForDisplayOrder, b: LeadForDisplayOrder) {
  return receivedTime(b) - receivedTime(a)
}

export function isFreshLead(lead: LeadForDisplayOrder) {
  return lead.crm?.call_status !== "spoken"
}

export function isFreshlyAssignedLead(lead: LeadForDisplayOrder) {
  if (!lead.assigned_at) return false
  const assignedAt = new Date(lead.assigned_at).getTime()
  if (Number.isNaN(assignedAt)) return false

  const viewedAt = lead.assignment_viewed_at
    ? new Date(lead.assignment_viewed_at).getTime()
    : Number.NaN

  return Number.isNaN(viewedAt) || assignedAt > viewedAt
}

export function getLeadDisplaySections<T extends LeadForDisplayOrder>(
  leads: T[],
  now: number,
): LeadDisplaySections<T> {
  const today = dateKey(new Date(now))
  // Never-contacted leads stay ahead of contacted ones — that ranking drives
  // the work queue. Within either group the newest lead comes first.
  const interactionSorted = [...leads].sort((a, b) => {
    const contacted = (lead: T) => (lead.crm?.call_status ? 1 : 0)
    const byContact = contacted(a) - contacted(b)
    if (byContact !== 0) return byContact
    return byReceivedDesc(a, b)
  })

  const overdue = interactionSorted.filter(lead => {
    const followUp = dateKey(lead.crm?.follow_up_date)
    return followUp && followUp < today
  })
  const dueToday = interactionSorted.filter(lead =>
    dateKey(lead.crm?.follow_up_date) === today &&
    followUpTimestamp(lead.crm?.follow_up_date) <= now
  )
  const rest = interactionSorted.filter(lead => {
    const followUp = dateKey(lead.crm?.follow_up_date)
    return !followUp || followUp > today ||
      (followUp === today && followUpTimestamp(lead.crm?.follow_up_date) > now)
  })

  return {
    dueToday,
    overdue,
    rest,
    ordered: [...dueToday, ...overdue, ...rest],
  }
}
