import { BadRequestException, Injectable } from '@nestjs/common'
import { and, count, eq, gte, isNull, lt, sql } from 'drizzle-orm'
import { bookings, leadActivityEvents, siteVisits, userProfiles } from '@pikorua/db'
import { DatabaseService } from '../../database/database.service'

const ACTIVITY_TIME_ZONE = 'Asia/Kolkata'
const IST_OFFSET = '+05:30'
export const MAX_HRM_ACTIVITY_RANGE_DAYS = 31

type ActivityCountRow = {
  employeeId: string | null
  date: string
  total: number
}

type Rep = {
  id: string
  email: string | null
  fullName: string | null
}

export type HrmActivityRow = {
  email: string
  name: string
  date: string
  callsMade: number
  siteVisits: number
  bookingsConfirmed: number
}

function strictDate(value: string | undefined, field: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) throw new BadRequestException(`${field} must use YYYY-MM-DD.`)

  const [, year, month, day] = match
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`)
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day)
  ) {
    throw new BadRequestException(`${field} must be a valid calendar date.`)
  }
  return value!
}

export function parseHrmActivityRange(fromValue?: string, toValue?: string) {
  const from = strictDate(fromValue, 'from')
  const to = strictDate(toValue, 'to')
  const fromDay = new Date(`${from}T00:00:00Z`)
  const toDay = new Date(`${to}T00:00:00Z`)
  const days = Math.round((toDay.getTime() - fromDay.getTime()) / 86_400_000) + 1

  if (days < 1) throw new BadRequestException('to must be on or after from.')
  if (days > MAX_HRM_ACTIVITY_RANGE_DAYS) {
    throw new BadRequestException(`Date range cannot exceed ${MAX_HRM_ACTIVITY_RANGE_DAYS} days.`)
  }

  const start = new Date(`${from}T00:00:00${IST_OFFSET}`)
  const endExclusive = new Date(`${to}T00:00:00${IST_OFFSET}`)
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)

  const dates = Array.from({ length: days }, (_, index) => {
    const date = new Date(fromDay)
    date.setUTCDate(date.getUTCDate() + index)
    return date.toISOString().slice(0, 10)
  })

  return { start, endExclusive, dates }
}

function countMap(rows: ActivityCountRow[]): Map<string, number> {
  return new Map(
    rows
      .filter((row) => row.employeeId)
      .map((row) => [`${row.employeeId}:${row.date}`, Number(row.total)]),
  )
}

export function buildHrmActivityRows(
  reps: Rep[],
  dates: string[],
  calls: ActivityCountRow[],
  visits: ActivityCountRow[],
  confirmedBookings: ActivityCountRow[],
): HrmActivityRow[] {
  const callCounts = countMap(calls)
  const visitCounts = countMap(visits)
  const bookingCounts = countMap(confirmedBookings)

  return reps.flatMap((rep) => dates.map((date) => {
    const key = `${rep.id}:${date}`
    return {
      email: rep.email ?? '',
      name: rep.fullName ?? rep.email ?? '',
      date,
      callsMade: callCounts.get(key) ?? 0,
      siteVisits: visitCounts.get(key) ?? 0,
      bookingsConfirmed: bookingCounts.get(key) ?? 0,
    }
  }))
}

@Injectable()
export class HrmActivityService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  async getActivity(fromValue?: string, toValue?: string) {
    const { start, endExclusive, dates } = parseHrmActivityRange(fromValue, toValue)
    const callDate = sql<string>`to_char(timezone(${ACTIVITY_TIME_ZONE}, ${leadActivityEvents.createdAt}), 'YYYY-MM-DD')`
    const visitDate = sql<string>`to_char(timezone(${ACTIVITY_TIME_ZONE}, ${siteVisits.scheduledDate}), 'YYYY-MM-DD')`
    const bookingConfirmationDate = sql<string>`to_char(timezone(${ACTIVITY_TIME_ZONE}, ${leadActivityEvents.createdAt}), 'YYYY-MM-DD')`

    const [reps, calls, visits, confirmedBookings] = await Promise.all([
      this.db.select({
        id: userProfiles.id,
        email: userProfiles.email,
        fullName: userProfiles.fullName,
      })
        .from(userProfiles)
        .where(and(
          eq(userProfiles.role, 'sales_executive'),
          eq(userProfiles.status, 'active'),
          isNull(userProfiles.deletedAt),
        ))
        .orderBy(userProfiles.fullName, userProfiles.email),
      this.db.select({
        employeeId: leadActivityEvents.actorUserId,
        date: callDate,
        total: count(),
      })
        .from(leadActivityEvents)
        .where(and(
          eq(leadActivityEvents.eventType, 'crm_updated'),
          sql`${leadActivityEvents.metadata}->>'call_logged' = 'true'`,
          gte(leadActivityEvents.createdAt, start),
          lt(leadActivityEvents.createdAt, endExclusive),
        ))
        .groupBy(leadActivityEvents.actorUserId, callDate),
      this.db.select({
        employeeId: siteVisits.employeeId,
        date: visitDate,
        total: count(),
      })
        .from(siteVisits)
        .where(and(
          eq(siteVisits.status, 'completed'),
          isNull(siteVisits.deletedAt),
          gte(siteVisits.scheduledDate, start),
          lt(siteVisits.scheduledDate, endExclusive),
        ))
        .groupBy(siteVisits.employeeId, visitDate),
      this.db.select({
        employeeId: bookings.assignedTo,
        date: bookingConfirmationDate,
        total: count(),
      })
        .from(leadActivityEvents)
        .innerJoin(
          bookings,
          sql`${leadActivityEvents.metadata}->>'booking_id' = ${bookings.id}::text`,
        )
        .where(and(
          eq(leadActivityEvents.source, 'booking'),
          sql`${leadActivityEvents.changes}->'booking_status'->>'to' = 'confirmed'`,
          isNull(bookings.deletedAt),
          gte(leadActivityEvents.createdAt, start),
          lt(leadActivityEvents.createdAt, endExclusive),
        ))
        .groupBy(bookings.assignedTo, bookingConfirmationDate),
    ])

    return { reps: buildHrmActivityRows(reps, dates, calls, visits, confirmedBookings) }
  }
}
