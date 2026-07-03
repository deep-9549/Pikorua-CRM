import { Injectable } from '@nestjs/common'
import { asc, desc, isNull } from 'drizzle-orm'
import {
  bookings,
  leadActivityEvents,
  metaLeads,
  properties,
  siteVisits,
  userProfiles,
  voiceCallLogs,
  voiceEvents,
  voiceTranscriptTurns,
} from '@pikorua/db'
import { DatabaseService } from '../../database/database.service'

type Range = { from: Date; to: Date }
type GroupBy = 'source' | 'campaign' | 'employee' | 'status' | 'city' | 'budget' | 'property' | 'propertyType'
type MetricFamily = 'all' | 'leads' | 'employees' | 'business' | 'activity' | 'voice'

export interface AiAnalyticsQuery {
  from?: string
  to?: string
  compareTo?: string
  groupBy?: GroupBy
  employeeId?: string
  source?: string
  campaignName?: string
  status?: string
  propertyId?: string
  metricFamily?: MetricFamily
}

interface OwnershipWindow {
  leadId: string
  employeeId: string
  assignedAt: Date
  releasedAt: Date | null
}

interface InsightCard {
  type: 'summary' | 'anomaly' | 'risk' | 'opportunity' | 'action'
  title: string
  detail: string
  severity: 'info' | 'positive' | 'warning' | 'critical'
  confidence: number
  reason: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_RANGE_DAYS = 30

function toDate(value: Date | string | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function dateInRange(value: Date | string | null | undefined, range: Range) {
  const date = toDate(value)
  return Boolean(date && date >= range.from && date < range.to)
}

function numberValue(value: unknown) {
  if (value === null || value === undefined) return 0
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : 0
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0
}

function normalizeLabel(value: unknown, fallback = 'Unspecified') {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || fallback
}

function addCount(map: Map<string, number>, key: unknown, amount = 1, fallback?: string) {
  const label = normalizeLabel(key, fallback)
  map.set(label, (map.get(label) ?? 0) + amount)
}

function topRows(map: Map<string, number>, limit = 12) {
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    .slice(0, limit)
}

function buildRange(query: AiAnalyticsQuery): Range {
  const to = toDate(query.to) ?? new Date()
  const from = toDate(query.from) ?? new Date(to.getTime() - DEFAULT_RANGE_DAYS * DAY_MS)
  return from < to ? { from, to } : { from: new Date(to.getTime() - DEFAULT_RANGE_DAYS * DAY_MS), to }
}

function buildCompareRange(query: AiAnalyticsQuery, current: Range): Range {
  const duration = current.to.getTime() - current.from.getTime()
  const compareEnd = query.compareTo && query.compareTo !== 'previous'
    ? (toDate(query.compareTo) ?? current.from)
    : current.from

  return {
    from: new Date(compareEnd.getTime() - duration),
    to: compareEnd,
  }
}

function serializeRange(range: Range) {
  return { from: range.from.toISOString(), to: range.to.toISOString() }
}

export function analyticsDelta(current: number, previous: number) {
  const absolute = current - previous
  const percentage = previous > 0
    ? Math.round((absolute / previous) * 1000) / 10
    : current > 0 ? 100 : 0
  return { current, previous, absolute, percentage }
}

function fallbackAssignmentStart(lead: any, before: Date) {
  return toDate(lead?.assignedAt) ?? toDate(lead?.receivedAt) ?? toDate(lead?.createdAt) ?? before
}

export function buildOwnershipWindows(leads: any[], events: any[]) {
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

  for (const current of open.values()) windows.push(current)

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

export function ownedAt(windows: OwnershipWindow[], leadId: string, employeeId: string, value: Date | string | null | undefined) {
  const date = toDate(value)
  if (!date) return false

  return windows.some((window) =>
    window.leadId === leadId &&
    window.employeeId === employeeId &&
    date >= window.assignedAt &&
    (!window.releasedAt || date < window.releasedAt)
  )
}

function ownershipStartedInRange(windows: OwnershipWindow[], leadId: string, employeeId: string, range: Range) {
  return windows.some((window) =>
    window.leadId === leadId &&
    window.employeeId === employeeId &&
    window.assignedAt >= range.from &&
    window.assignedAt < range.to
  )
}

function leadPassesStaticFilters(lead: any, query: AiAnalyticsQuery) {
  if (query.source && lead.source !== query.source) return false
  if (query.campaignName && lead.campaignName !== query.campaignName) return false
  if (query.status && lead.status !== query.status) return false
  return true
}

function leadPassesEmployeeAt(windows: OwnershipWindow[], lead: any, query: AiAnalyticsQuery, at: Date | string | null | undefined) {
  if (!query.employeeId) return true
  return ownedAt(windows, lead.id, query.employeeId, at)
}

function eventCallDates(lead: any) {
  const dates = [toDate(lead.crmDetails?.firstCallDate), toDate(lead.crmDetails?.lastCallDate)]
    .filter((date): date is Date => Boolean(date))
  return [...new Set(dates.map((date) => date.getTime()))].map((time) => new Date(time))
}

export function buildAiAnalyticsInsightCards(current: any, previous: any): InsightCard[] {
  const cards: InsightCard[] = []
  const leadDelta = analyticsDelta(current.leads.received, previous.leads.received)
  const callDelta = analyticsDelta(current.activity.callsLogged, previous.activity.callsLogged)
  const revenueDelta = analyticsDelta(current.business.confirmedRevenue, previous.business.confirmedRevenue)

  cards.push({
    type: 'summary',
    title: 'Executive readout',
    detail: `${current.leads.received} leads, ${current.activity.callsLogged} calls, ${current.activity.siteVisitsScheduled} site visits, and Rs ${Math.round(current.business.confirmedRevenue).toLocaleString('en-IN')} confirmed revenue in the selected period.`,
    severity: 'info',
    confidence: 0.96,
    reason: 'Generated from aggregate lead, activity, site visit, booking, and revenue counters.',
  })

  if (leadDelta.percentage <= -20) {
    cards.push({
      type: 'anomaly',
      title: 'Lead inflow dropped',
      detail: `Lead volume is down ${Math.abs(leadDelta.percentage)}% versus the comparison period.`,
      severity: 'warning',
      confidence: 0.9,
      reason: 'Current received leads are at least 20% below the previous period.',
    })
  } else if (leadDelta.percentage >= 20) {
    cards.push({
      type: 'opportunity',
      title: 'Lead inflow is accelerating',
      detail: `Lead volume is up ${leadDelta.percentage}% versus the comparison period. Check source and campaign mix before assigning capacity.`,
      severity: 'positive',
      confidence: 0.88,
      reason: 'Current received leads are at least 20% above the previous period.',
    })
  }

  if (callDelta.percentage <= -15 && current.leads.received > 0) {
    cards.push({
      type: 'risk',
      title: 'Calling activity may be lagging',
      detail: `Calls logged are down ${Math.abs(callDelta.percentage)}% while leads still entered the pipeline.`,
      severity: 'warning',
      confidence: 0.86,
      reason: 'Call volume fell by at least 15% against the comparison period.',
    })
  }

  if (current.activity.overdueFollowUps > 0) {
    cards.push({
      type: 'action',
      title: 'Follow-up backlog needs attention',
      detail: `${current.activity.overdueFollowUps} follow-ups are overdue in the selected slice.`,
      severity: current.activity.overdueFollowUps >= 10 ? 'critical' : 'warning',
      confidence: 0.94,
      reason: 'Overdue follow-ups are counted from CRM follow-up dates before today.',
    })
  }

  if (revenueDelta.percentage >= 20) {
    cards.push({
      type: 'opportunity',
      title: 'Revenue momentum improved',
      detail: `Confirmed revenue is up ${revenueDelta.percentage}% compared with the previous period.`,
      severity: 'positive',
      confidence: 0.9,
      reason: 'Confirmed booking amount increased by at least 20%.',
    })
  }

  if (current.voice.hotAlerts > 0 || current.voice.escalations > 0) {
    cards.push({
      type: 'action',
      title: 'AI Voice flagged priority conversations',
      detail: `${current.voice.hotAlerts} hot alerts and ${current.voice.escalations} escalations were recorded by AI Voice.`,
      severity: current.voice.escalations > 0 ? 'critical' : 'warning',
      confidence: 0.88,
      reason: 'AI Voice event aggregates include hot_alert and escalation event types.',
    })
  }

  if (cards.length === 1) {
    cards.push({
      type: 'summary',
      title: 'No sharp anomalies detected',
      detail: 'The selected period does not show a major rule-based spike, drop, or backlog across the tracked metrics.',
      severity: 'positive',
      confidence: 0.78,
      reason: 'No configured threshold was crossed for lead inflow, calls, revenue, follow-ups, or AI Voice alerts.',
    })
  }

  return cards.slice(0, 8)
}

@Injectable()
export class AiAnalyticsService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  private async loadData() {
    const [leads, employees, visits, bookingRows, propertyRows, events, voice] = await Promise.all([
      this.db.query.metaLeads.findMany({
        where: isNull(metaLeads.deletedAt),
        with: { crmDetails: true },
        orderBy: [desc(metaLeads.receivedAt)],
      }),
      this.db.query.userProfiles.findMany({
        where: isNull(userProfiles.deletedAt),
        orderBy: [asc(userProfiles.fullName)],
      }),
      this.db.query.siteVisits.findMany({
        where: isNull(siteVisits.deletedAt),
        with: { lead: true, property: true, employee: true },
        orderBy: [desc(siteVisits.scheduledDate)],
      }),
      this.db.query.bookings.findMany({
        where: isNull(bookings.deletedAt),
        with: { lead: true, property: true, assignedEmployee: true },
        orderBy: [desc(bookings.bookedAt)],
      }),
      this.db.query.properties.findMany({
        where: isNull(properties.deletedAt),
        orderBy: [asc(properties.name)],
      }),
      this.db.query.leadActivityEvents.findMany({
        orderBy: [asc(leadActivityEvents.createdAt)],
      }),
      this.loadVoiceData(),
    ])

    return { leads, employees, visits, bookings: bookingRows, properties: propertyRows, events, voice }
  }

  private async loadVoiceData() {
    try {
      const [calls, events, telemetry] = await Promise.all([
        this.db.query.voiceCallLogs.findMany({
          with: { scores: true },
          orderBy: [desc(voiceCallLogs.receivedAt)],
        }),
        this.db.query.voiceEvents.findMany({
          orderBy: [desc(voiceEvents.at)],
        }),
        this.db
          .select({
            callLogId: voiceTranscriptTurns.callLogId,
            sttMs: voiceTranscriptTurns.sttMs,
            llmMs: voiceTranscriptTurns.llmMs,
            ttsMs: voiceTranscriptTurns.ttsMs,
            tokensPrompt: voiceTranscriptTurns.tokensPrompt,
            tokensCompletion: voiceTranscriptTurns.tokensCompletion,
          })
          .from(voiceTranscriptTurns),
      ])
      return { calls, events, telemetry, available: true }
    } catch {
      return { calls: [], events: [], telemetry: [], available: false }
    }
  }

  private employeeNameById(employees: any[]) {
    return new Map(employees.map((employee) => [
      employee.id,
      employee.fullName ?? employee.email ?? 'Unnamed employee',
    ]))
  }

  private aggregate(data: Awaited<ReturnType<AiAnalyticsService['loadData']>>, range: Range, query: AiAnalyticsQuery) {
    const ownershipWindows = buildOwnershipWindows(data.leads, data.events)
    const employeeNames = this.employeeNameById(data.employees)
    const sourceMap = new Map<string, number>()
    const campaignMap = new Map<string, number>()
    const cityMap = new Map<string, number>()
    const budgetMap = new Map<string, number>()
    const statusMap = new Map<string, number>()
    const employeeLeadMap = new Map<string, number>()
    const propertyDemandMap = new Map<string, number>()
    const propertyTypeMap = new Map<string, number>()
    const voiceLabelMap = new Map<string, number>()

    const metrics = {
      leads: {
        totalInCrm: 0,
        received: 0,
        assigned: 0,
        unassigned: 0,
        leadStageConverted: 0,
        rejected: 0,
        coldPool: 0,
        fresh: 0,
        hot: 0,
        warm: 0,
        cold: 0,
        spokenRate: 0,
      },
      activity: {
        callsLogged: 0,
        spokenCalls: 0,
        notSpokenCalls: 0,
        callbackCalls: 0,
        followUpsDue: 0,
        overdueFollowUps: 0,
        followUpsDone: 0,
        siteVisitsScheduled: 0,
        siteVisitsCompleted: 0,
        siteVisitsCancelled: 0,
        siteVisitNoShows: 0,
        crmUpdates: 0,
        assignments: 0,
        transfers: 0,
      },
      business: {
        confirmedBookings: 0,
        pendingBookings: 0,
        cancelledBookings: 0,
        confirmedRevenue: 0,
        pendingRevenue: 0,
        commission: 0,
        bookingConversion: 0,
        averageBookingValue: 0,
        availableProperties: 0,
        soldProperties: 0,
        reservedProperties: 0,
        upcomingProperties: 0,
      },
      employees: {
        activeSalesExecutives: data.employees.filter((employee) => employee.role === 'sales_executive' && employee.status !== 'inactive').length,
        touchedEmployees: 0,
        topEmployees: [] as Array<{ name: string; value: number }>,
      },
      voice: {
        available: data.voice.available,
        calls: 0,
        answeredCalls: 0,
        reviewedCalls: 0,
        unreviewedCalls: 0,
        dncRequests: 0,
        hotAlerts: 0,
        escalations: 0,
        guardrailBlocks: 0,
        avgDurationSec: 0,
        avgScore: 0,
        avgSttMs: 0,
        avgLlmMs: 0,
        avgTtsMs: 0,
        promptTokens: 0,
        completionTokens: 0,
      },
    }

    for (const lead of data.leads) {
      if (!leadPassesStaticFilters(lead, query)) continue
      const receivedInRange = dateInRange(lead.receivedAt, range)
      const assignedAt = toDate(lead.assignedAt)
      const employeeMatch = !query.employeeId ||
        (receivedInRange && leadPassesEmployeeAt(ownershipWindows, lead, query, lead.receivedAt)) ||
        ownershipStartedInRange(ownershipWindows, lead.id, query.employeeId, range)

      if (!employeeMatch) continue
      metrics.leads.totalInCrm += 1

      if (receivedInRange) {
        metrics.leads.received += 1
        addCount(sourceMap, lead.source)
        addCount(campaignMap, lead.campaignName)
        addCount(cityMap, lead.city)
        addCount(statusMap, lead.status)
        addCount(budgetMap, lead.crmDetails?.budgetRange)
        if (lead.assignedTo) addCount(employeeLeadMap, employeeNames.get(lead.assignedTo), 1, 'Unassigned')
      }

      if (lead.status === 'assigned' && (!assignedAt || dateInRange(assignedAt, range))) metrics.leads.assigned += 1
      if (lead.status === 'unassigned' && receivedInRange) metrics.leads.unassigned += 1
      if (lead.status === 'converted' && dateInRange(lead.updatedAt, range)) metrics.leads.leadStageConverted += 1
      if (lead.status === 'rejected' && dateInRange(lead.updatedAt, range)) metrics.leads.rejected += 1
      if (lead.status === 'cold_pool' && dateInRange(lead.updatedAt, range)) metrics.leads.coldPool += 1
      if (!lead.assignedTo && receivedInRange) metrics.leads.fresh += 1
      if (lead.crmDetails?.hwc === 'hot') metrics.leads.hot += 1
      if (lead.crmDetails?.hwc === 'warm') metrics.leads.warm += 1
      if (lead.crmDetails?.hwc === 'cold') metrics.leads.cold += 1

      const callDates = eventCallDates(lead).filter((date) =>
        dateInRange(date, range) &&
        leadPassesEmployeeAt(ownershipWindows, lead, query, date)
      )
      if (callDates.length > 0 && lead.crmDetails?.callStatus) {
        metrics.activity.callsLogged += callDates.length
        if (lead.crmDetails.callStatus === 'spoken') metrics.activity.spokenCalls += callDates.length
        if (lead.crmDetails.callStatus === 'not_spoken') metrics.activity.notSpokenCalls += callDates.length
        if (lead.crmDetails.callStatus === 'call_back_later') metrics.activity.callbackCalls += callDates.length
      }

      if (dateInRange(lead.crmDetails?.followUpDate, range) && leadPassesEmployeeAt(ownershipWindows, lead, query, lead.crmDetails?.followUpDate)) {
        metrics.activity.followUpsDue += 1
        if (lead.crmDetails?.followUpDone) metrics.activity.followUpsDone += 1
      }

      const followUpDate = toDate(lead.crmDetails?.followUpDate)
      if (followUpDate && followUpDate < new Date() && !lead.crmDetails?.followUpDone) {
        metrics.activity.overdueFollowUps += 1
      }
    }

    for (const event of data.events) {
      if (!dateInRange(event.createdAt, range)) continue
      if (query.employeeId && event.actorUserId !== query.employeeId && event.fromUserId !== query.employeeId && event.toUserId !== query.employeeId) continue
      if (event.eventType === 'crm_updated') metrics.activity.crmUpdates += 1
      if (event.eventType === 'assigned') metrics.activity.assignments += 1
      if (event.eventType === 'transferred') metrics.activity.transfers += 1
    }

    for (const visit of data.visits) {
      const lead = visit.lead
      if (!dateInRange(visit.scheduledDate, range)) continue
      if (query.propertyId && visit.propertyId !== query.propertyId) continue
      if (lead && !leadPassesStaticFilters(lead, query)) continue
      if (query.employeeId && visit.employeeId !== query.employeeId) continue

      metrics.activity.siteVisitsScheduled += 1
      if (visit.status === 'completed') metrics.activity.siteVisitsCompleted += 1
      if (visit.status === 'cancelled') metrics.activity.siteVisitsCancelled += 1
      if (visit.status === 'no_show') metrics.activity.siteVisitNoShows += 1
      addCount(propertyDemandMap, visit.property?.name)
      addCount(propertyTypeMap, visit.property?.type)
    }

    for (const booking of data.bookings) {
      const lead = booking.lead
      if (!dateInRange(booking.bookedAt, range)) continue
      if (query.propertyId && booking.propertyId !== query.propertyId) continue
      if (lead && !leadPassesStaticFilters(lead, query)) continue
      if (query.employeeId && booking.assignedTo !== query.employeeId) continue

      const amount = numberValue(booking.amount)
      const commission = numberValue(booking.commission)
      if (booking.status === 'confirmed') {
        metrics.business.confirmedBookings += 1
        metrics.business.confirmedRevenue += amount
        metrics.business.commission += commission
      }
      if (booking.status === 'pending') {
        metrics.business.pendingBookings += 1
        metrics.business.pendingRevenue += amount
      }
      if (booking.status === 'cancelled') metrics.business.cancelledBookings += 1
      addCount(propertyDemandMap, booking.property?.name)
      addCount(propertyTypeMap, booking.property?.type)
    }

    for (const property of data.properties) {
      if (query.propertyId && property.id !== query.propertyId) continue
      if (property.status === 'available') metrics.business.availableProperties += 1
      if (property.status === 'sold') metrics.business.soldProperties += 1
      if (property.status === 'reserved') metrics.business.reservedProperties += 1
      if (property.status === 'upcoming') metrics.business.upcomingProperties += 1
      addCount(propertyTypeMap, property.type)
    }

    let totalVoiceDuration = 0
    let scoredCalls = 0
    let scoreTotal = 0
    for (const call of data.voice.calls) {
      if (!dateInRange(call.receivedAt ?? call.endedAt ?? call.answeredAt, range)) continue
      if (query.source || query.campaignName || query.status || query.propertyId) {
        const lead = data.leads.find((row) => row.id === call.leadId)
        if (!lead || !leadPassesStaticFilters(lead, query)) continue
      }
      if (query.employeeId) {
        const lead = data.leads.find((row) => row.id === call.leadId)
        if (!lead || !leadPassesEmployeeAt(ownershipWindows, lead, query, call.receivedAt ?? call.endedAt ?? call.answeredAt)) continue
      }

      metrics.voice.calls += 1
      if (call.answeredAt) metrics.voice.answeredCalls += 1
      if (call.reviewed) metrics.voice.reviewedCalls += 1
      else metrics.voice.unreviewedCalls += 1
      if (call.dnc) metrics.voice.dncRequests += 1
      totalVoiceDuration += numberValue(call.durationSec)

      for (const score of call.scores ?? []) {
        scoredCalls += 1
        scoreTotal += numberValue(score.score)
        addCount(voiceLabelMap, score.labelOverride ?? score.labelAi)
      }
    }

    for (const event of data.voice.events) {
      if (!dateInRange(event.at, range)) continue
      if (event.type === 'hot_alert') metrics.voice.hotAlerts += 1
      if (event.type === 'escalation') metrics.voice.escalations += 1
      if (event.type === 'guardrail_block') metrics.voice.guardrailBlocks += 1
    }

    let sttTotal = 0
    let llmTotal = 0
    let ttsTotal = 0
    let sttCount = 0
    let llmCount = 0
    let ttsCount = 0
    for (const row of data.voice.telemetry) {
      if (row.sttMs !== null) { sttTotal += row.sttMs; sttCount += 1 }
      if (row.llmMs !== null) { llmTotal += row.llmMs; llmCount += 1 }
      if (row.ttsMs !== null) { ttsTotal += row.ttsMs; ttsCount += 1 }
      metrics.voice.promptTokens += numberValue(row.tokensPrompt)
      metrics.voice.completionTokens += numberValue(row.tokensCompletion)
    }

    metrics.leads.spokenRate = percent(metrics.activity.spokenCalls, metrics.activity.callsLogged)
    metrics.business.bookingConversion = percent(metrics.business.confirmedBookings, metrics.leads.received)
    metrics.business.averageBookingValue = metrics.business.confirmedBookings > 0
      ? Math.round(metrics.business.confirmedRevenue / metrics.business.confirmedBookings)
      : 0
    metrics.employees.topEmployees = topRows(employeeLeadMap, 8)
    metrics.employees.touchedEmployees = metrics.employees.topEmployees.length
    metrics.voice.avgDurationSec = metrics.voice.calls > 0 ? Math.round(totalVoiceDuration / metrics.voice.calls) : 0
    metrics.voice.avgScore = scoredCalls > 0 ? Math.round((scoreTotal / scoredCalls) * 10) / 10 : 0
    metrics.voice.avgSttMs = sttCount > 0 ? Math.round(sttTotal / sttCount) : 0
    metrics.voice.avgLlmMs = llmCount > 0 ? Math.round(llmTotal / llmCount) : 0
    metrics.voice.avgTtsMs = ttsCount > 0 ? Math.round(ttsTotal / ttsCount) : 0

    return {
      metrics,
      dimensions: {
        sources: topRows(sourceMap),
        campaigns: topRows(campaignMap),
        cities: topRows(cityMap),
        budgets: topRows(budgetMap),
        statuses: topRows(statusMap),
        properties: topRows(propertyDemandMap),
        propertyTypes: topRows(propertyTypeMap),
        voiceLabels: topRows(voiceLabelMap),
      },
      filterOptions: {
        employees: data.employees
          .filter((employee) => employee.role === 'sales_executive' && employee.status !== 'inactive')
          .map((employee) => ({
            id: employee.id,
            name: employee.fullName ?? employee.email ?? 'Unnamed employee',
          })),
        properties: data.properties.map((property) => ({
          id: property.id,
          name: property.name,
        })),
      },
    }
  }

  private buildDeltas(current: any, previous: any) {
    return {
      leads: analyticsDelta(current.leads.received, previous.leads.received),
      calls: analyticsDelta(current.activity.callsLogged, previous.activity.callsLogged),
      spokenRate: analyticsDelta(current.leads.spokenRate, previous.leads.spokenRate),
      siteVisits: analyticsDelta(current.activity.siteVisitsScheduled, previous.activity.siteVisitsScheduled),
      leadStageConversions: analyticsDelta(current.leads.leadStageConverted, previous.leads.leadStageConverted),
      confirmedBookings: analyticsDelta(current.business.confirmedBookings, previous.business.confirmedBookings),
      confirmedRevenue: analyticsDelta(current.business.confirmedRevenue, previous.business.confirmedRevenue),
      voiceCalls: analyticsDelta(current.voice.calls, previous.voice.calls),
      hotAlerts: analyticsDelta(current.voice.hotAlerts, previous.voice.hotAlerts),
    }
  }

  async getOverview(query: AiAnalyticsQuery) {
    const data = await this.loadData()
    const range = buildRange(query)
    const compareRange = buildCompareRange(query, range)
    const current = this.aggregate(data, range, query)
    const previous = this.aggregate(data, compareRange, query)

    return {
      generatedAt: new Date().toISOString(),
      freshness: {
        currentPeriod: 'live',
        historicalSnapshots: 'schema_ready',
      },
      filters: query,
      range: serializeRange(range),
      compareRange: serializeRange(compareRange),
      metrics: current.metrics,
      dimensions: current.dimensions,
      filterOptions: current.filterOptions,
      deltas: this.buildDeltas(current.metrics, previous.metrics),
      insights: buildAiAnalyticsInsightCards(current.metrics, previous.metrics),
    }
  }

  async getComparison(query: AiAnalyticsQuery) {
    const data = await this.loadData()
    const range = buildRange(query)
    const compareRange = buildCompareRange(query, range)
    const current = this.aggregate(data, range, query)
    const previous = this.aggregate(data, compareRange, query)

    return {
      generatedAt: new Date().toISOString(),
      range: serializeRange(range),
      compareRange: serializeRange(compareRange),
      current: current.metrics,
      previous: previous.metrics,
      deltas: this.buildDeltas(current.metrics, previous.metrics),
    }
  }

  async getDrilldown(query: AiAnalyticsQuery) {
    const overview = await this.getOverview(query)
    const groupBy = query.groupBy ?? 'source'
    const dimensionKey: Record<GroupBy, keyof typeof overview.dimensions> = {
      source: 'sources',
      campaign: 'campaigns',
      employee: 'sources',
      status: 'statuses',
      city: 'cities',
      budget: 'budgets',
      property: 'properties',
      propertyType: 'propertyTypes',
    }
    const rows = groupBy === 'employee'
      ? overview.metrics.employees.topEmployees
      : overview.dimensions[dimensionKey[groupBy]]

    return {
      generatedAt: overview.generatedAt,
      groupBy,
      range: overview.range,
      rows,
      note: 'Rows contain aggregate counts only. Lead PII and transcript text are intentionally excluded.',
    }
  }

  async getInsights(query: AiAnalyticsQuery) {
    const comparison = await this.getComparison(query)
    return {
      generatedAt: comparison.generatedAt,
      range: comparison.range,
      compareRange: comparison.compareRange,
      insights: buildAiAnalyticsInsightCards(comparison.current, comparison.previous),
      inputPolicy: 'aggregate_metrics_only',
    }
  }
}
