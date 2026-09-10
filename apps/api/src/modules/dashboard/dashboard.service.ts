import { BadRequestException, Injectable } from '@nestjs/common'
import { eq, count, sum, desc, asc, and, isNull, inArray, or } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { metaLeads, bookings, siteVisits, userProfiles, leadActivityEvents } from '@pikorua/db'
import { EmployeeReportInsightsService } from './employee-report-insights.service'

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const EMPLOYEE_PERFORMANCE_CACHE_TTL_MS = 30_000
const EMPLOYEE_PERFORMANCE_CACHE_MAX_ENTRIES = 100

type PeriodKey = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'lifetime'

interface PeriodRange {
  key: PeriodKey
  label: string
  start: Date | null
  end: Date | null
}

interface PerformanceSummary {
  totalLeads: number
  activeLeads: number
  convertedLeads: number
  rejectedLeads: number
  coldPoolLeads: number
  callsLogged: number
  spokenCalls: number
  notSpokenCalls: number
  callbackCalls: number
  followUpsDue: number
  siteVisitsScheduled: number
  siteVisitsCompleted: number
  hotLeads: number
  warmLeads: number
  coldLeads: number
  conversionRate: number
}

interface TrendRow {
  label: string
  month: string
  leads: number
  calls: number
  visits: number
  conversions: number
}

interface CallActivity {
  leadId: string
  callStatus: string | null
  createdAt: Date
}

interface LeadQualityMark {
  leadId: string
  subjectId: string
  status: string | null
  createdAt: Date
}

interface OwnershipWindow {
  leadId: string
  employeeId: string
  assignedAt: Date
  releasedAt: Date | null
}

type PerformanceActivityEvent = Pick<
  typeof leadActivityEvents.$inferSelect,
  | 'id'
  | 'leadId'
  | 'actorUserId'
  | 'eventType'
  | 'changes'
  | 'metadata'
  | 'fromUserId'
  | 'toUserId'
  | 'createdAt'
>

type OwnershipIndex = Map<string, OwnershipWindow[]>

const OWNERSHIP_EVENT_TYPES: PerformanceActivityEvent['eventType'][] = [
  'lead_created',
  'assigned',
  'transferred',
  'unassigned',
]

const PERFORMANCE_EVENT_TYPES: PerformanceActivityEvent['eventType'][] = [
  ...OWNERSHIP_EVENT_TYPES,
  'crm_updated',
  'client_status_updated',
]

function serializeEmployee(user: typeof userProfiles.$inferSelect) {
  return {
    id: user.id,
    full_name: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    created_at: user.createdAt,
  }
}

function istShift(date: Date) {
  return new Date(date.getTime() + IST_OFFSET_MS)
}

function startOfIstDay(date: Date) {
  const shifted = istShift(date)
  return new Date(Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  ) - IST_OFFSET_MS)
}

function startOfIstWeek(date: Date) {
  const dayStart = startOfIstDay(date)
  const shifted = istShift(dayStart)
  const day = shifted.getUTCDay()
  const daysSinceMonday = (day + 6) % 7
  return new Date(dayStart.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000)
}

function startOfIstMonth(date: Date) {
  const shifted = istShift(date)
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) - IST_OFFSET_MS)
}

function startOfIstYear(date: Date) {
  const shifted = istShift(date)
  return new Date(Date.UTC(shifted.getUTCFullYear(), 0, 1) - IST_OFFSET_MS)
}

function addMonths(date: Date, months: number) {
  const shifted = istShift(date)
  return new Date(Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + months,
    1,
  ) - IST_OFFSET_MS)
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

function buildPeriodRanges(now: Date): PeriodRange[] {
  const day = startOfIstDay(now)
  const week = startOfIstWeek(now)
  const month = startOfIstMonth(now)
  const year = startOfIstYear(now)

  return [
    { key: 'daily', label: 'Today', start: day, end: new Date(day.getTime() + 24 * 60 * 60 * 1000) },
    { key: 'weekly', label: 'This week', start: week, end: new Date(week.getTime() + 7 * 24 * 60 * 60 * 1000) },
    { key: 'monthly', label: 'This month', start: month, end: addMonths(month, 1) },
    { key: 'yearly', label: 'This year', start: year, end: new Date(Date.UTC(istShift(year).getUTCFullYear() + 1, 0, 1) - IST_OFFSET_MS) },
    { key: 'lifetime', label: 'Lifetime', start: null, end: null },
  ]
}

function inRange(value: Date | string | null | undefined, range: PeriodRange) {
  if (!range.start || !range.end) return Boolean(value)
  if (!value) return false
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return date >= range.start && date < range.end
}

function emptySummary(): PerformanceSummary {
  return {
    totalLeads: 0,
    activeLeads: 0,
    convertedLeads: 0,
    rejectedLeads: 0,
    coldPoolLeads: 0,
    callsLogged: 0,
    spokenCalls: 0,
    notSpokenCalls: 0,
    callbackCalls: 0,
    followUpsDue: 0,
    siteVisitsScheduled: 0,
    siteVisitsCompleted: 0,
    hotLeads: 0,
    warmLeads: 0,
    coldLeads: 0,
    conversionRate: 0,
  }
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })
}

function dayLabel(date: Date) {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
}

function weekdayLabel(date: Date) {
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })
}

function hourLabel(date: Date) {
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true, timeZone: 'Asia/Kolkata' })
}

function yearLabel(date: Date) {
  return date.toLocaleDateString('en-IN', { year: 'numeric', timeZone: 'Asia/Kolkata' })
}

function toDate(value: Date | string | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function fallbackAssignmentStart(lead: any, before: Date) {
  return toDate(lead?.assignedAt) ?? toDate(lead?.receivedAt) ?? toDate(lead?.createdAt) ?? before
}

export function buildOwnershipWindows(leads: any[], events: PerformanceActivityEvent[]) {
  const leadById = new Map(leads.map((lead) => [lead.id, lead]))
  const windows: OwnershipWindow[] = []
  const open = new Map<string, OwnershipWindow>()

  for (const event of events) {
    if (!['lead_created', 'assigned', 'transferred', 'unassigned'].includes(event.eventType)) continue

    const eventAt = event.createdAt
    const lead = leadById.get(event.leadId)

    if ((event.eventType === 'transferred' || event.eventType === 'unassigned') && event.fromUserId) {
      const current = open.get(event.leadId)

      if (current?.employeeId === event.fromUserId) {
        windows.push({ ...current, releasedAt: eventAt })
        open.delete(event.leadId)
      } else {
        windows.push({
          leadId: event.leadId,
          employeeId: event.fromUserId,
          assignedAt: fallbackAssignmentStart(lead, eventAt),
          releasedAt: eventAt,
        })
      }
    }

    if (['lead_created', 'assigned', 'transferred'].includes(event.eventType) && event.toUserId) {
      const current = open.get(event.leadId)
      if (current && current.employeeId !== event.toUserId) {
        windows.push({ ...current, releasedAt: eventAt })
      }

      if (!current || current.employeeId !== event.toUserId) {
        open.set(event.leadId, {
          leadId: event.leadId,
          employeeId: event.toUserId,
          assignedAt: eventAt,
          releasedAt: null,
        })
      }
    }
  }

  for (const current of open.values()) {
    windows.push(current)
  }

  for (const lead of leads) {
    if (!lead.assignedTo) continue
    const current = open.get(lead.id)
    const hasCurrentWindow = current?.employeeId === lead.assignedTo

    if (!hasCurrentWindow) {
      windows.push({
        leadId: lead.id,
        employeeId: lead.assignedTo,
        assignedAt: fallbackAssignmentStart(lead, new Date()),
        releasedAt: null,
      })
    }
  }

  return windows
}

function ownershipKey(leadId: string, employeeId: string) {
  return `${leadId}:${employeeId}`
}

export function buildOwnershipIndex(windows: OwnershipWindow[]): OwnershipIndex {
  const index: OwnershipIndex = new Map()
  for (const window of windows) {
    const key = ownershipKey(window.leadId, window.employeeId)
    const matches = index.get(key)
    if (matches) matches.push(window)
    else index.set(key, [window])
  }
  return index
}

function employeeOwnershipWindows(index: OwnershipIndex, leadId: string, employeeId: string) {
  return index.get(ownershipKey(leadId, employeeId)) ?? []
}

function windowOverlapsRange(window: OwnershipWindow, range: PeriodRange) {
  if (!range.start || !range.end) return true
  const release = window.releasedAt ?? new Date(8640000000000000)
  return window.assignedAt < range.end && release >= range.start
}

function ownershipStartedInRange(window: OwnershipWindow, range: PeriodRange) {
  if (!range.start || !range.end) return true
  return window.assignedAt >= range.start && window.assignedAt < range.end
}

export function ownedAt(index: OwnershipIndex, leadId: string, employeeId: string, value: Date | string | null | undefined) {
  const date = toDate(value)
  if (!date) return false

  return employeeOwnershipWindows(index, leadId, employeeId).some((window) =>
    date >= window.assignedAt &&
    (!window.releasedAt || date < window.releasedAt)
  )
}

function ownedDuringPeriod(index: OwnershipIndex, leadId: string, employeeId: string, range: PeriodRange) {
  return employeeOwnershipWindows(index, leadId, employeeId).some((window) =>
    windowOverlapsRange(window, range)
  )
}

function ownershipStartedDuringPeriod(index: OwnershipIndex, leadId: string, employeeId: string, range: PeriodRange) {
  return employeeOwnershipWindows(index, leadId, employeeId).some((window) =>
    ownershipStartedInRange(window, range)
  )
}

function attributedCallDates(lead: any, index: OwnershipIndex, employeeId: string, range: PeriodRange) {
  const dates = [
    toDate(lead.crmDetails?.firstCallDate),
    toDate(lead.crmDetails?.lastCallDate),
  ].filter((date): date is Date => Boolean(date))

  const uniqueTimes = [...new Set(dates.map((date) => date.getTime()))]
  return uniqueTimes
    .map((time) => new Date(time))
    .filter((date) =>
      inRange(date, range) &&
      ownedAt(index, lead.id, employeeId, date)
    )
}

function metadataValue(event: PerformanceActivityEvent, key: string) {
  const metadata = event.metadata
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)[key]
    : null
}

function changedValue(event: PerformanceActivityEvent, key: string) {
  const changes = event.changes
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return undefined
  const change = (changes as Record<string, unknown>)[key]
  if (!change || typeof change !== 'object' || Array.isArray(change) || !('to' in change)) return undefined
  const value = (change as { to: unknown }).to
  return typeof value === 'string' ? value : null
}

function buildLeadQualityMarks(
  events: PerformanceActivityEvent[],
  employeeId: string,
): LeadQualityMark[] {
  return events.flatMap((event) => {
    // Authorship is the durable attribution source for quality marks. Do not
    // require a reconstructed ownership window here: older transferred leads
    // can have valid status activity even when their assignment history began
    // before activity logging was introduced.
    if (event.actorUserId !== employeeId) return []

    const status = event.eventType === 'client_status_updated'
      ? changedValue(event, 'status')
      : event.eventType === 'crm_updated'
        ? changedValue(event, 'hwc')
        : undefined
    if (status === undefined) return []

    const clientId = metadataValue(event, 'client_id')
    return [{
      leadId: event.leadId,
      // Client-status saves are logged once per linked inquiry. Group them by
      // client so a repeat customer is counted once for the employee's mark.
      subjectId: typeof clientId === 'string' ? `client:${clientId}` : `lead:${event.leadId}`,
      status,
      createdAt: event.createdAt,
    }]
  })
}

function latestQualityMarksInRange(marks: LeadQualityMark[], range: PeriodRange) {
  const latest = new Map<string, LeadQualityMark>()
  for (const mark of marks) {
    if (!inRange(mark.createdAt, range)) continue
    const current = latest.get(mark.subjectId)
    if (!current || mark.createdAt >= current.createdAt) latest.set(mark.subjectId, mark)
  }
  return [...latest.values()]
}

function buildCallActivities(events: PerformanceActivityEvent[], index: OwnershipIndex, employeeId: string): CallActivity[] {
  return events
    .map((event) => {
      const savedAt = typeof metadataValue(event, 'saved_at') === 'string'
        ? toDate(String(metadataValue(event, 'saved_at')))
        : null

      return {
        event,
        savedAt: savedAt ?? event.createdAt,
      }
    })
    .filter(({ event, savedAt }) =>
      event.eventType === 'crm_updated' &&
      event.actorUserId === employeeId &&
      metadataValue(event, 'call_logged') === true &&
      ownedAt(index, event.leadId, employeeId, savedAt)
    )
    .map(({ event, savedAt }) => ({
      leadId: event.leadId,
      callStatus: typeof metadataValue(event, 'call_status') === 'string'
        ? String(metadataValue(event, 'call_status'))
        : null,
      createdAt: savedAt,
    }))
}

function callActivitiesInRange(activities: CallActivity[], range: PeriodRange) {
  return activities.filter((activity) => inRange(activity.createdAt, range))
}

function legacyCallActivitiesInRange(
  leads: any[],
  events: CallActivity[],
  ownershipIndex: OwnershipIndex,
  employeeId: string,
  range: PeriodRange,
) {
  const loggedLeadIds = new Set(events.map((event) => event.leadId))
  return leads.flatMap((lead) => {
    if (loggedLeadIds.has(lead.id) || !lead.crmDetails?.callStatus) return []

    return attributedCallDates(lead, ownershipIndex, employeeId, range).map((date) => ({
      leadId: lead.id,
      callStatus: lead.crmDetails.callStatus,
      createdAt: date,
    }))
  })
}

function periodCallActivities(
  leads: any[],
  activities: CallActivity[],
  ownershipIndex: OwnershipIndex,
  employeeId: string,
  range: PeriodRange,
) {
  const eventsInRange = callActivitiesInRange(activities, range)
  return [
    ...eventsInRange,
    ...legacyCallActivitiesInRange(leads, activities, ownershipIndex, employeeId, range),
  ]
}

function monthsBetween(start: Date, end: Date) {
  const startShifted = istShift(start)
  const endShifted = istShift(end)
  return (endShifted.getUTCFullYear() - startShifted.getUTCFullYear()) * 12 +
    (endShifted.getUTCMonth() - startShifted.getUTCMonth())
}

function earliestTrendDate(leads: any[], visits: any[], windows: OwnershipWindow[], ownershipIndex: OwnershipIndex, employeeId: string, activities: CallActivity[]) {
  const times: number[] = []

  for (const window of windows) {
    if (window.employeeId === employeeId) times.push(window.assignedAt.getTime())
  }

  for (const activity of activities) {
    times.push(activity.createdAt.getTime())
  }

  for (const lead of leads) {
    const callDates = [lead.crmDetails?.firstCallDate, lead.crmDetails?.lastCallDate]
      .map(toDate)
      .filter((date): date is Date => Boolean(date))

    for (const date of callDates) {
      if (ownedAt(ownershipIndex, lead.id, employeeId, date)) times.push(date.getTime())
    }

    if (lead.status === 'converted' && ownedAt(ownershipIndex, lead.id, employeeId, lead.updatedAt)) {
      const updatedAt = toDate(lead.updatedAt)
      if (updatedAt) times.push(updatedAt.getTime())
    }
  }

  for (const visit of visits) {
    const scheduledDate = toDate(visit.scheduledDate)
    if (scheduledDate) times.push(scheduledDate.getTime())
  }

  return times.length > 0 ? new Date(Math.min(...times)) : null
}

function buildTrendBuckets(
  key: PeriodKey,
  now: Date,
  leads: any[],
  visits: any[],
  windows: OwnershipWindow[],
  ownershipIndex: OwnershipIndex,
  employeeId: string,
  activities: CallActivity[],
): PeriodRange[] {
  if (key === 'daily') {
    const start = startOfIstDay(now)
    return Array.from({ length: 24 }, (_, index) => {
      const bucketStart = addHours(start, index)
      return { key, label: hourLabel(bucketStart), start: bucketStart, end: addHours(bucketStart, 1) }
    })
  }

  if (key === 'weekly') {
    const start = startOfIstWeek(now)
    return Array.from({ length: 7 }, (_, index) => {
      const bucketStart = addDays(start, index)
      return { key, label: weekdayLabel(bucketStart), start: bucketStart, end: addDays(bucketStart, 1) }
    })
  }

  if (key === 'monthly') {
    const start = startOfIstMonth(now)
    const end = addMonths(start, 1)
    const days = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))

    return Array.from({ length: days }, (_, index) => {
      const bucketStart = addDays(start, index)
      return { key, label: dayLabel(bucketStart), start: bucketStart, end: addDays(bucketStart, 1) }
    })
  }

  if (key === 'yearly') {
    const start = startOfIstYear(now)
    return Array.from({ length: 12 }, (_, index) => {
      const bucketStart = addMonths(start, index)
      return { key, label: monthLabel(bucketStart), start: bucketStart, end: addMonths(bucketStart, 1) }
    })
  }

  const earliest = earliestTrendDate(leads, visits, windows, ownershipIndex, employeeId, activities)
  if (!earliest) return []

  const lifetimeStartMonth = startOfIstMonth(earliest)
  const currentMonth = startOfIstMonth(now)
  const monthCount = monthsBetween(lifetimeStartMonth, currentMonth) + 1

  if (monthCount <= 24) {
    return Array.from({ length: monthCount }, (_, index) => {
      const bucketStart = addMonths(lifetimeStartMonth, index)
      return { key, label: `${monthLabel(bucketStart)} ${yearLabel(bucketStart)}`, start: bucketStart, end: addMonths(bucketStart, 1) }
    })
  }

  const startYear = startOfIstYear(earliest)
  const currentYear = startOfIstYear(now)
  const yearCount = istShift(currentYear).getUTCFullYear() - istShift(startYear).getUTCFullYear() + 1

  return Array.from({ length: yearCount }, (_, index) => {
    const shifted = istShift(startYear)
    const bucketStart = new Date(Date.UTC(shifted.getUTCFullYear() + index, 0, 1) - IST_OFFSET_MS)
    return { key, label: yearLabel(bucketStart), start: bucketStart, end: new Date(Date.UTC(shifted.getUTCFullYear() + index + 1, 0, 1) - IST_OFFSET_MS) }
  })
}

function trendBucketIndex(buckets: PeriodRange[], value: Date | string | null | undefined) {
  const date = toDate(value)
  if (!date) return -1
  return buckets.findIndex((bucket) => inRange(date, bucket))
}

export function buildTrendRows(
  key: PeriodKey,
  now: Date,
  leads: any[],
  visits: any[],
  windows: OwnershipWindow[],
  ownershipIndex: OwnershipIndex,
  employeeId: string,
  activities: CallActivity[],
): TrendRow[] {
  const buckets = buildTrendBuckets(key, now, leads, visits, windows, ownershipIndex, employeeId, activities)
  const rows = buckets.map((range) => ({
    label: range.label,
    month: range.label,
    leads: 0,
    calls: 0,
    visits: 0,
    conversions: 0,
  }))
  const assignedLeadIds = buckets.map(() => new Set<string>())

  for (const window of windows) {
    if (window.employeeId !== employeeId) continue
    const bucketIndex = trendBucketIndex(buckets, window.assignedAt)
    if (bucketIndex >= 0) assignedLeadIds[bucketIndex].add(window.leadId)
  }

  const loggedLeadIds = new Set(activities.map((activity) => activity.leadId))
  for (const activity of activities) {
    const bucketIndex = trendBucketIndex(buckets, activity.createdAt)
    if (bucketIndex >= 0) rows[bucketIndex].calls += 1
  }

  for (const lead of leads) {
    if (!loggedLeadIds.has(lead.id) && lead.crmDetails?.callStatus) {
      const dates = [
        toDate(lead.crmDetails?.firstCallDate),
        toDate(lead.crmDetails?.lastCallDate),
      ].filter((date): date is Date => Boolean(date))
      const uniqueTimes = new Set(dates.map((date) => date.getTime()))
      for (const time of uniqueTimes) {
        const date = new Date(time)
        if (!ownedAt(ownershipIndex, lead.id, employeeId, date)) continue
        const bucketIndex = trendBucketIndex(buckets, date)
        if (bucketIndex >= 0) rows[bucketIndex].calls += 1
      }
    }

    if (lead.status === 'converted' && ownedAt(ownershipIndex, lead.id, employeeId, lead.updatedAt)) {
      const bucketIndex = trendBucketIndex(buckets, lead.updatedAt)
      if (bucketIndex >= 0) rows[bucketIndex].conversions += 1
    }
  }

  for (const visit of visits) {
    const bucketIndex = trendBucketIndex(buckets, visit.scheduledDate)
    if (bucketIndex >= 0) rows[bucketIndex].visits += 1
  }

  for (let index = 0; index < rows.length; index += 1) {
    rows[index].leads = assignedLeadIds[index].size
  }

  return rows
}

function summarizeRange(
  range: PeriodRange,
  leads: any[],
  visits: any[],
  ownershipIndex: OwnershipIndex,
  employeeId: string,
  callActivities: CallActivity[],
  qualityMarks: LeadQualityMark[],
) {
  const summary = emptySummary()

  for (const lead of leads) {
    const assignedInPeriod = ownershipStartedDuringPeriod(ownershipIndex, lead.id, employeeId, range)
    const ownedInPeriod = ownedDuringPeriod(ownershipIndex, lead.id, employeeId, range)
    const convertedInPeriod = lead.status === 'converted'
      && inRange(lead.updatedAt, range)
      && ownedAt(ownershipIndex, lead.id, employeeId, lead.updatedAt)

    if (assignedInPeriod) summary.totalLeads += 1

    if (ownedInPeriod) {
      if (lead.assignedTo === employeeId && lead.status === 'assigned') summary.activeLeads += 1
      if (lead.status === 'rejected') summary.rejectedLeads += 1
      if (lead.status === 'cold_pool') summary.coldPoolLeads += 1
    }

    if (convertedInPeriod) summary.convertedLeads += 1

    if (
      lead.crmDetails?.followUpDate &&
      inRange(lead.crmDetails.followUpDate, range) &&
      ownedAt(ownershipIndex, lead.id, employeeId, lead.crmDetails.followUpDate)
    ) {
      summary.followUpsDue += 1
    }
  }

  for (const mark of latestQualityMarksInRange(qualityMarks, range)) {
    if (mark.status === 'hot') summary.hotLeads += 1
    if (mark.status === 'warm') summary.warmLeads += 1
    if (mark.status === 'cold') summary.coldLeads += 1
  }

  const periodCalls = periodCallActivities(leads, callActivities, ownershipIndex, employeeId, range)
  summary.callsLogged = periodCalls.length
  summary.spokenCalls = periodCalls.filter((activity) => activity.callStatus === 'spoken').length
  summary.notSpokenCalls = periodCalls.filter((activity) => activity.callStatus === 'not_spoken').length
  summary.callbackCalls = periodCalls.filter((activity) => activity.callStatus === 'call_back_later').length

  for (const visit of visits) {
    if (!range.start || !range.end || inRange(visit.scheduledDate, range)) {
      summary.siteVisitsScheduled += 1
      if (visit.status === 'completed') summary.siteVisitsCompleted += 1
    }
  }

  summary.conversionRate = summary.totalLeads > 0
    ? Math.round((summary.convertedLeads / summary.totalLeads) * 1000) / 10
    : 0

  return summary
}

function parseIstDate(value: string, field: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new BadRequestException(`${field} must use YYYY-MM-DD.`)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const shifted = new Date(Date.UTC(year, month - 1, day))
  if (
    shifted.getUTCFullYear() !== year ||
    shifted.getUTCMonth() !== month - 1 ||
    shifted.getUTCDate() !== day
  ) {
    throw new BadRequestException(`${field} is not a valid date.`)
  }
  return new Date(shifted.getTime() - IST_OFFSET_MS)
}

function customTrendRows(
  range: PeriodRange,
  leads: any[],
  visits: any[],
  ownershipIndex: OwnershipIndex,
  employeeId: string,
  activities: CallActivity[],
) {
  if (!range.start || !range.end) return []
  const totalDays = Math.ceil((range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000))
  const bucketDays = totalDays <= 45 ? 1 : totalDays <= 210 ? 7 : totalDays <= 1095 ? 30 : 90
  const bucketCount = Math.ceil(totalDays / bucketDays)

  return Array.from({ length: bucketCount }, (_, index) => {
    const start = addDays(range.start!, index * bucketDays)
    const end = new Date(Math.min(addDays(start, bucketDays).getTime(), range.end!.getTime()))
    const bucket: PeriodRange = {
      key: 'monthly',
      label: dayLabel(start),
      start,
      end,
    }
    return {
      label: bucket.label,
      month: bucket.label,
      leads: leads.filter((lead) => ownershipStartedDuringPeriod(ownershipIndex, lead.id, employeeId, bucket)).length,
      calls: periodCallActivities(leads, activities, ownershipIndex, employeeId, bucket).length,
      visits: visits.filter((visit) => inRange(visit.scheduledDate, bucket)).length,
      conversions: leads.filter((lead) =>
        lead.status === 'converted' &&
        inRange(lead.updatedAt, bucket) &&
        ownedAt(ownershipIndex, lead.id, employeeId, lead.updatedAt)
      ).length,
    }
  })
}

function reportRatios(summary: PerformanceSummary) {
  const percent = (numerator: number, denominator: number) => denominator > 0
    ? Math.round((numerator / denominator) * 1000) / 10
    : 0
  const decimal = (numerator: number, denominator: number) => denominator > 0
    ? Math.round((numerator / denominator) * 100) / 100
    : 0

  return {
    callbackRate: percent(summary.callbackCalls, summary.callsLogged),
    contactRate: percent(summary.spokenCalls, summary.callsLogged),
    visitCompletionRate: percent(summary.siteVisitsCompleted, summary.siteVisitsScheduled),
    conversionRate: summary.conversionRate,
    callsPerLead: decimal(summary.callsLogged, summary.totalLeads),
    callsPerConversion: decimal(summary.callsLogged, summary.convertedLeads),
  }
}

@Injectable()
export class DashboardService {
  private readonly employeePerformanceCache = new Map<string, { expiresAt: number; value: unknown }>()
  private readonly employeePerformanceInFlight = new Map<string, Promise<unknown>>()

  constructor(
    private readonly database: DatabaseService,
    private readonly employeeReportInsights: EmployeeReportInsightsService,
  ) {}

  private get db() { return this.database.db }

  async getStats() {
    // These counts are independent, so issue them concurrently instead of
    // paying four sequential DB round-trips (especially costly cross-region).
    const [[leadsResult], [bookingsResult], [activeDeals], [visitsResult]] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(metaLeads)
        .where(isNull(metaLeads.deletedAt)),
      this.db
        .select({ total: count(), revenue: sum(bookings.amount) })
        .from(bookings)
        .where(and(isNull(bookings.deletedAt), eq(bookings.status, 'confirmed'))),
      this.db
        .select({ total: count() })
        .from(bookings)
        .where(and(isNull(bookings.deletedAt), eq(bookings.status, 'pending'))),
      this.db
        .select({ total: count() })
        .from(siteVisits)
        .where(isNull(siteVisits.deletedAt)),
    ])

    return {
      totalLeads: leadsResult?.total ?? 0,
      totalRevenue: bookingsResult?.revenue ?? 0,
      confirmedBookings: bookingsResult?.total ?? 0,
      activeDeals: activeDeals?.total ?? 0,
      totalSiteVisits: visitsResult?.total ?? 0,
    }
  }

  async getLeadsBreakdown() {
    const [byStatus, byCampaign] = await Promise.all([
      this.db
        .select({ status: metaLeads.status, total: count() })
        .from(metaLeads)
        .where(isNull(metaLeads.deletedAt))
        .groupBy(metaLeads.status),
      this.db
        .select({ campaign: metaLeads.campaignName, total: count() })
        .from(metaLeads)
        .where(isNull(metaLeads.deletedAt))
        .groupBy(metaLeads.campaignName)
        .orderBy(desc(count()))
        .limit(10),
    ])

    return { byStatus, byCampaign }
  }

  async getRevenueBreakdown() {
    const [byMonth, recentBookings] = await Promise.all([
      this.db
        .select({ amount: bookings.amount, bookedAt: bookings.bookedAt })
        .from(bookings)
        .where(and(isNull(bookings.deletedAt), eq(bookings.status, 'confirmed')))
        .orderBy(desc(bookings.bookedAt))
        .limit(100),
      this.db.query.bookings.findMany({
        where: and(isNull(bookings.deletedAt)),
        with: { lead: true, property: true, assignedEmployee: true },
        orderBy: [desc(bookings.bookedAt)],
        limit: 10,
      }),
    ])

    return { byMonth, recentBookings }
  }

  getEmployeePerformance(
    caller: { id: string; role: string },
    employeeId?: string,
    startDate?: string,
    endDate?: string,
    listOnly = false,
    requestedPeriod?: string,
  ): Promise<unknown> {
    // Super admins may inspect any executive. Everyone else is pinned to their
    // own record regardless of the employeeId they ask for, so the response is
    // scoped before it ever reaches the cache.
    const isAdmin = caller.role === 'super_admin'
    const scopedEmployeeId = isAdmin ? employeeId : caller.id
    const cacheKey = JSON.stringify([
      isAdmin,
      scopedEmployeeId ?? null,
      startDate ?? null,
      endDate ?? null,
      listOnly,
      requestedPeriod ?? 'monthly',
    ])
    const now = Date.now()
    const cached = this.employeePerformanceCache.get(cacheKey)
    if (cached && cached.expiresAt > now) return Promise.resolve(cached.value)
    if (cached) this.employeePerformanceCache.delete(cacheKey)

    const inFlight = this.employeePerformanceInFlight.get(cacheKey)
    if (inFlight) return inFlight

    const request = this.calculateEmployeePerformance(
      isAdmin,
      scopedEmployeeId,
      startDate,
      endDate,
      listOnly,
      requestedPeriod,
    ).then((value) => {
      if (this.employeePerformanceCache.size >= EMPLOYEE_PERFORMANCE_CACHE_MAX_ENTRIES) {
        const oldestKey = this.employeePerformanceCache.keys().next().value
        if (oldestKey !== undefined) this.employeePerformanceCache.delete(oldestKey)
      }
      this.employeePerformanceCache.set(cacheKey, {
        expiresAt: Date.now() + EMPLOYEE_PERFORMANCE_CACHE_TTL_MS,
        value,
      })
      return value
    }).finally(() => {
      this.employeePerformanceInFlight.delete(cacheKey)
    })

    this.employeePerformanceInFlight.set(cacheKey, request)
    return request
  }

  private async calculateEmployeePerformance(
    isAdmin: boolean,
    employeeId?: string,
    startDate?: string,
    endDate?: string,
    listOnly = false,
    requestedPeriod?: string,
  ) {
    if ((startDate && !endDate) || (!startDate && endDate)) {
      throw new BadRequestException('Both startDate and endDate are required for a custom report.')
    }
    if (startDate && endDate && !employeeId) {
      throw new BadRequestException('employeeId is required for a custom report.')
    }
    const validPeriods: PeriodKey[] = ['daily', 'weekly', 'monthly', 'yearly', 'lifetime']
    if (requestedPeriod && !validPeriods.includes(requestedPeriod as PeriodKey)) {
      throw new BadRequestException(`period must be one of: ${validPeriods.join(', ')}.`)
    }
    const selectedPeriod = (requestedPeriod ?? 'monthly') as PeriodKey
    // A super admin picks from the whole sales team. A non-admin caller has
    // already been pinned to their own id upstream, so their "team" is just
    // themselves — which also keeps the selection logic below unchanged.
    const employees = await this.db.query.userProfiles.findMany({
      where: isAdmin
        ? and(
            eq(userProfiles.role, 'sales_executive'),
            isNull(userProfiles.deletedAt),
          )
        : and(
            eq(userProfiles.id, employeeId!),
            isNull(userProfiles.deletedAt),
          ),
      orderBy: [desc(userProfiles.createdAt)],
    })

    if (listOnly) {
      return {
        employees: employees.map(serializeEmployee),
        selectedEmployee: null,
        periods: {},
        trend: [],
        recentLeads: [],
        customReport: null,
        generatedAt: new Date().toISOString(),
      }
    }

    const requestedEmployee = employeeId
      ? employees.find((employee) => employee.id === employeeId) ?? null
      : null
    if (employeeId && !requestedEmployee) {
      throw new BadRequestException('Selected employee was not found.')
    }
    const selectedEmployee = requestedEmployee ?? employees[0] ?? null

    if (!selectedEmployee) {
      return {
        employees: [],
        selectedEmployee: null,
        periods: {},
        trend: [],
        recentLeads: [],
        generatedAt: new Date().toISOString(),
      }
    }

    const [employeeEvents, currentLeads, visits] = await Promise.all([
      this.db.query.leadActivityEvents.findMany({
        columns: {
          id: true,
          leadId: true,
          actorUserId: true,
          eventType: true,
          changes: true,
          metadata: true,
          fromUserId: true,
          toUserId: true,
          createdAt: true,
        },
        where: and(
          inArray(leadActivityEvents.eventType, PERFORMANCE_EVENT_TYPES),
          or(
            eq(leadActivityEvents.toUserId, selectedEmployee.id),
            eq(leadActivityEvents.fromUserId, selectedEmployee.id),
            eq(leadActivityEvents.actorUserId, selectedEmployee.id),
          ),
        ),
        orderBy: [asc(leadActivityEvents.createdAt)],
      }),
      this.db.query.metaLeads.findMany({
        where: and(
          eq(metaLeads.assignedTo, selectedEmployee.id),
          isNull(metaLeads.deletedAt),
        ),
        with: {
          crmDetails: true,
        },
        orderBy: [desc(metaLeads.receivedAt)],
      }),
      this.db.query.siteVisits.findMany({
        where: and(
          eq(siteVisits.employeeId, selectedEmployee.id),
          isNull(siteVisits.deletedAt),
        ),
        with: {
          lead: true,
        },
        orderBy: [desc(siteVisits.scheduledDate)],
      }),
    ])

    const leadIds = [...new Set([
      ...employeeEvents.map((event) => event.leadId),
      ...currentLeads.map((lead) => lead.id),
      ...visits.map((visit) => visit.leadId),
    ])]

    const [leads, assignmentEvents] = leadIds.length > 0
      ? await Promise.all([
          this.db.query.metaLeads.findMany({
            where: and(
              inArray(metaLeads.id, leadIds),
              isNull(metaLeads.deletedAt),
            ),
            with: {
              crmDetails: true,
            },
            orderBy: [desc(metaLeads.receivedAt)],
          }),
          this.db.query.leadActivityEvents.findMany({
            columns: {
              id: true,
              leadId: true,
              actorUserId: true,
              eventType: true,
              changes: true,
              metadata: true,
              fromUserId: true,
              toUserId: true,
              createdAt: true,
            },
            where: and(
              inArray(leadActivityEvents.leadId, leadIds),
              inArray(leadActivityEvents.eventType, OWNERSHIP_EVENT_TYPES),
            ),
            orderBy: [asc(leadActivityEvents.createdAt)],
          }),
        ])
      : [[], []]

    const ownershipWindows = buildOwnershipWindows(leads, assignmentEvents)
    const ownershipIndex = buildOwnershipIndex(ownershipWindows)
    const callActivities = buildCallActivities(employeeEvents, ownershipIndex, selectedEmployee.id)
    const qualityMarks = buildLeadQualityMarks(employeeEvents, selectedEmployee.id)

    const now = new Date()
    const periods = buildPeriodRanges(now)
    const summaries: Partial<Record<PeriodKey, PerformanceSummary>> = {}
    const trendByPeriod: Partial<Record<PeriodKey, TrendRow[]>> = {}
    let trend: TrendRow[] = []

    // Custom reports build their own requested and comparison ranges below. For the
    // analysis page, calculate only the selected tab and let the client load others lazily.
    if (!startDate && !endDate) {
      const range = periods.find((candidate) => candidate.key === selectedPeriod)!
      summaries[selectedPeriod] = summarizeRange(
        range,
        leads,
        visits,
        ownershipIndex,
        selectedEmployee.id,
        callActivities,
        qualityMarks,
      )
      trend = buildTrendRows(selectedPeriod, now, leads, visits, ownershipWindows, ownershipIndex, selectedEmployee.id, callActivities)
      trendByPeriod[selectedPeriod] = trend
    }

    const mostRecentOwnershipStart = new Map<string, number>()
    for (const window of ownershipWindows) {
      if (window.employeeId !== selectedEmployee.id) continue
      const assignedAt = window.assignedAt.getTime()
      const current = mostRecentOwnershipStart.get(window.leadId)
      if (current === undefined || assignedAt > current) {
        mostRecentOwnershipStart.set(window.leadId, assignedAt)
      }
    }

    const mostRecentLeadQuality = new Map<string, LeadQualityMark>()
    for (const mark of qualityMarks) {
      const current = mostRecentLeadQuality.get(mark.leadId)
      if (!current || mark.createdAt > current.createdAt) mostRecentLeadQuality.set(mark.leadId, mark)
    }

    const recentLeads = [...leads]
      .sort((a, b) => (mostRecentOwnershipStart.get(b.id) ?? 0) - (mostRecentOwnershipStart.get(a.id) ?? 0))
      .slice(0, 8)
      .map((lead) => {
        const ownershipStart = mostRecentOwnershipStart.get(lead.id) ?? null

        return {
          id: lead.id,
          full_name: lead.fullName,
          phone: lead.phone,
          city: lead.city,
          campaign_name: lead.campaignName,
          status: lead.status,
          received_at: lead.receivedAt,
          assigned_at: ownershipStart ? new Date(ownershipStart).toISOString() : null,
          ownership_status: lead.assignedTo === selectedEmployee.id ? 'current' : 'previous',
          call_status: lead.crmDetails?.callStatus ?? null,
          follow_up_date: lead.crmDetails?.followUpDate ?? null,
          hwc: mostRecentLeadQuality.get(lead.id)?.status ?? null,
          buying_status: lead.crmDetails?.buyingStatus ?? null,
          site_visit_status: lead.crmDetails?.siteVisitStatus ?? null,
        }
      })

    let customReport = null
    if (startDate && endDate) {
      const customStart = parseIstDate(startDate, 'startDate')
      const customEndStart = parseIstDate(endDate, 'endDate')
      const customEnd = addDays(customEndStart, 1)
      if (customEnd <= customStart) {
        throw new BadRequestException('endDate must be on or after startDate.')
      }
      const rangeDays = Math.ceil((customEnd.getTime() - customStart.getTime()) / (24 * 60 * 60 * 1000))
      if (rangeDays > 1827) {
        throw new BadRequestException('Custom reports are limited to five years.')
      }

      const customRange: PeriodRange = {
        key: 'monthly',
        label: 'Custom range',
        start: customStart,
        end: customEnd,
      }
      const previousRange: PeriodRange = {
        key: 'monthly',
        label: 'Previous range',
        start: addDays(customStart, -rangeDays),
        end: customStart,
      }
      const summary = summarizeRange(customRange, leads, visits, ownershipIndex, selectedEmployee.id, callActivities, qualityMarks)
      const previousSummary = summarizeRange(previousRange, leads, visits, ownershipIndex, selectedEmployee.id, callActivities, qualityMarks)
      const ratios = reportRatios(summary)
      const previousRatios = reportRatios(previousSummary)
      const insights = await this.employeeReportInsights.analyze({
        employee: selectedEmployee.fullName ?? selectedEmployee.email ?? 'Employee',
        range: { startDate, endDate },
        summary: { ...summary },
        previousSummary: { ...previousSummary },
        ratios: { ...ratios },
      })

      customReport = {
        range: { startDate, endDate, days: rangeDays },
        summary,
        previousSummary,
        ratios,
        previousRatios,
        trend: customTrendRows(customRange, leads, visits, ownershipIndex, selectedEmployee.id, callActivities),
        insights,
      }
    }

    return {
      employees: employees.map(serializeEmployee),
      selectedEmployee: serializeEmployee(selectedEmployee),
      periods: summaries,
      trend,
      trendByPeriod,
      customReport,
      recentLeads,
      transferSafe: true,
      generatedAt: now.toISOString(),
    }
  }
}
