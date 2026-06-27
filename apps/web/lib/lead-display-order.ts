export interface LeadOrderCrm {
  call_status?: string | null
  follow_up_date?: string | null
}

export interface LeadForDisplayOrder {
  id: string
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

export function isFreshLead(lead: LeadForDisplayOrder) {
  return lead.crm?.call_status !== "spoken"
}

export function getLeadDisplaySections<T extends LeadForDisplayOrder>(
  leads: T[],
  now: number,
): LeadDisplaySections<T> {
  const today = dateKey(new Date(now))
  const interactionSorted = [...leads].sort((a, b) => {
    const contacted = (lead: T) => (lead.crm?.call_status ? 1 : 0)
    return contacted(a) - contacted(b)
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
