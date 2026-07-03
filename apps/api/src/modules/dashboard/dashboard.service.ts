import { Injectable } from '@nestjs/common'
import { eq, count, sum, desc, asc, and, isNull, inArray, or } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { metaLeads, bookings, siteVisits, userProfiles, leadActivityEvents } from '@pikorua/db'

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

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

interface OwnershipWindow {
  leadId: string
  employeeId: string
  assignedAt: Date
  releasedAt: Date | null
}

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

function toDate(value: Date | string | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function fallbackAssignmentStart(lead: any, before: Date) {
  return toDate(lead?.assignedAt) ?? toDate(lead?.receivedAt) ?? toDate(lead?.createdAt) ?? before
}

function buildOwnershipWindows(leads: any[], events: Array<typeof leadActivityEvents.$inferSelect>) {
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
    const hasCurrentWindow = windows.some((window) =>
      window.leadId === lead.id &&
      window.employeeId === lead.assignedTo &&
      window.releasedAt === null
    )

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

function windowOverlapsRange(window: OwnershipWindow, range: PeriodRange) {
  if (!range.start || !range.end) return true
  const release = window.releasedAt ?? new Date(8640000000000000)
  return window.assignedAt < range.end && release >= range.start
}

function ownershipStartedInRange(window: OwnershipWindow, range: PeriodRange) {
  if (!range.start || !range.end) return true
  return window.assignedAt >= range.start && window.assignedAt < range.end
}

function ownedAt(windows: OwnershipWindow[], leadId: string, employeeId: string, value: Date | string | null | undefined) {
  const date = toDate(value)
  if (!date) return false

  return windows.some((window) =>
    window.leadId === leadId &&
    window.employeeId === employeeId &&
    date >= window.assignedAt &&
    (!window.releasedAt || date < window.releasedAt)
  )
}

function ownedDuringPeriod(windows: OwnershipWindow[], leadId: string, employeeId: string, range: PeriodRange) {
  return windows.some((window) =>
    window.leadId === leadId &&
    window.employeeId === employeeId &&
    windowOverlapsRange(window, range)
  )
}

function ownershipStartedDuringPeriod(windows: OwnershipWindow[], leadId: string, employeeId: string, range: PeriodRange) {
  return windows.some((window) =>
    window.leadId === leadId &&
    window.employeeId === employeeId &&
    ownershipStartedInRange(window, range)
  )
}

function attributedCallDates(lead: any, windows: OwnershipWindow[], employeeId: string, range: PeriodRange) {
  const dates = [
    toDate(lead.crmDetails?.firstCallDate),
    toDate(lead.crmDetails?.lastCallDate),
  ].filter((date): date is Date => Boolean(date))

  const uniqueTimes = [...new Set(dates.map((date) => date.getTime()))]
  return uniqueTimes
    .map((time) => new Date(time))
    .filter((date) =>
      inRange(date, range) &&
      ownedAt(windows, lead.id, employeeId, date)
    )
}

@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService) {}

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

  async getEmployeePerformance(employeeId?: string) {
    const employees = await this.db.query.userProfiles.findMany({
      where: and(
        eq(userProfiles.role, 'sales_executive'),
        isNull(userProfiles.deletedAt),
      ),
      orderBy: [desc(userProfiles.createdAt)],
    })

    const selectedEmployee = employees.find((employee) => employee.id === employeeId) ?? employees[0] ?? null

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

    const [employeeAssignmentEvents, currentLeads, visits] = await Promise.all([
      this.db.query.leadActivityEvents.findMany({
        where: or(
          eq(leadActivityEvents.toUserId, selectedEmployee.id),
          eq(leadActivityEvents.fromUserId, selectedEmployee.id),
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
      ...employeeAssignmentEvents.map((event) => event.leadId),
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
            where: inArray(leadActivityEvents.leadId, leadIds),
            orderBy: [asc(leadActivityEvents.createdAt)],
          }),
        ])
      : [[], []]

    const ownershipWindows = buildOwnershipWindows(leads, assignmentEvents)

    const now = new Date()
    const periods = buildPeriodRanges(now)
    const summaries = periods.reduce<Record<PeriodKey, PerformanceSummary>>((acc, period) => {
      const summary = emptySummary()

      for (const lead of leads) {
        const assignedInPeriod = ownershipStartedDuringPeriod(ownershipWindows, lead.id, selectedEmployee.id, period)
        const ownedInPeriod = ownedDuringPeriod(ownershipWindows, lead.id, selectedEmployee.id, period)
        const convertedInPeriod = lead.status === 'converted'
          && inRange(lead.updatedAt, period)
          && ownedAt(ownershipWindows, lead.id, selectedEmployee.id, lead.updatedAt)

        if (assignedInPeriod) {
          summary.totalLeads += 1
        }

        if (ownedInPeriod) {
          if (lead.assignedTo === selectedEmployee.id && lead.status === 'assigned') summary.activeLeads += 1
          if (lead.status === 'rejected') summary.rejectedLeads += 1
          if (lead.status === 'cold_pool') summary.coldPoolLeads += 1
          if (lead.crmDetails?.hwc === 'hot') summary.hotLeads += 1
          if (lead.crmDetails?.hwc === 'warm') summary.warmLeads += 1
          if (lead.crmDetails?.hwc === 'cold') summary.coldLeads += 1
        }

        if (convertedInPeriod) summary.convertedLeads += 1

        if (attributedCallDates(lead, ownershipWindows, selectedEmployee.id, period).length > 0) {
          if (lead.crmDetails?.callStatus) summary.callsLogged += 1
          if (lead.crmDetails?.callStatus === 'spoken') summary.spokenCalls += 1
          if (lead.crmDetails?.callStatus === 'not_spoken') summary.notSpokenCalls += 1
          if (lead.crmDetails?.callStatus === 'call_back_later') summary.callbackCalls += 1
        }

        if (
          lead.crmDetails?.followUpDate &&
          inRange(lead.crmDetails.followUpDate, period) &&
          ownedAt(ownershipWindows, lead.id, selectedEmployee.id, lead.crmDetails.followUpDate)
        ) {
          summary.followUpsDue += 1
        }
      }

      for (const visit of visits) {
        if (period.key === 'lifetime' || inRange(visit.scheduledDate, period)) {
          summary.siteVisitsScheduled += 1
          if (visit.status === 'completed') summary.siteVisitsCompleted += 1
        }
      }

      summary.conversionRate = summary.totalLeads > 0
        ? Math.round((summary.convertedLeads / summary.totalLeads) * 1000) / 10
        : 0

      acc[period.key] = summary
      return acc
    }, {} as Record<PeriodKey, PerformanceSummary>)

    const trend = Array.from({ length: 12 }, (_, index) => {
      const start = addMonths(startOfIstMonth(now), index - 11)
      const end = addMonths(start, 1)
      const range: PeriodRange = { key: 'monthly', label: monthLabel(start), start, end }

      return {
        month: monthLabel(start),
        leads: leads.filter((lead) => ownershipStartedDuringPeriod(ownershipWindows, lead.id, selectedEmployee.id, range)).length,
        calls: leads.filter((lead) => lead.crmDetails?.callStatus && attributedCallDates(lead, ownershipWindows, selectedEmployee.id, range).length > 0).length,
        visits: visits.filter((visit) => inRange(visit.scheduledDate, range)).length,
        conversions: leads.filter((lead) =>
          lead.status === 'converted' &&
          inRange(lead.updatedAt, range) &&
          ownedAt(ownershipWindows, lead.id, selectedEmployee.id, lead.updatedAt)
        ).length,
      }
    })

    const mostRecentOwnershipStart = (leadId: string) => {
      const starts = ownershipWindows
        .filter((window) => window.leadId === leadId && window.employeeId === selectedEmployee.id)
        .map((window) => window.assignedAt.getTime())
      return starts.length > 0 ? Math.max(...starts) : null
    }

    const recentLeads = [...leads]
      .sort((a, b) => (mostRecentOwnershipStart(b.id) ?? 0) - (mostRecentOwnershipStart(a.id) ?? 0))
      .slice(0, 8)
      .map((lead) => {
        const ownershipStart = mostRecentOwnershipStart(lead.id)

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
          hwc: lead.crmDetails?.hwc ?? null,
          buying_status: lead.crmDetails?.buyingStatus ?? null,
          site_visit_status: lead.crmDetails?.siteVisitStatus ?? null,
        }
      })

    return {
      employees: employees.map(serializeEmployee),
      selectedEmployee: serializeEmployee(selectedEmployee),
      periods: summaries,
      trend,
      recentLeads,
      transferSafe: true,
      generatedAt: now.toISOString(),
    }
  }
}
