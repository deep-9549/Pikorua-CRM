import { Injectable } from '@nestjs/common'
import { eq, count, sum, desc, and, isNull, gte } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { metaLeads, bookings, siteVisits, employees } from '@pikorua/db'

@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  async getStats() {
    const [leadsResult] = await this.db
      .select({ total: count() })
      .from(metaLeads)
      .where(isNull(metaLeads.deletedAt))

    const [bookingsResult] = await this.db
      .select({ total: count(), revenue: sum(bookings.amount) })
      .from(bookings)
      .where(and(isNull(bookings.deletedAt), eq(bookings.status, 'confirmed')))

    const [activeDeals] = await this.db
      .select({ total: count() })
      .from(bookings)
      .where(and(isNull(bookings.deletedAt), eq(bookings.status, 'pending')))

    const [visitsResult] = await this.db
      .select({ total: count() })
      .from(siteVisits)
      .where(isNull(siteVisits.deletedAt))

    return {
      totalLeads: leadsResult?.total ?? 0,
      totalRevenue: bookingsResult?.revenue ?? 0,
      confirmedBookings: bookingsResult?.total ?? 0,
      activeDeals: activeDeals?.total ?? 0,
      totalSiteVisits: visitsResult?.total ?? 0,
    }
  }

  async getLeadsBreakdown() {
    const byStatus = await this.db
      .select({ status: metaLeads.status, total: count() })
      .from(metaLeads)
      .where(isNull(metaLeads.deletedAt))
      .groupBy(metaLeads.status)

    const byCampaign = await this.db
      .select({ campaign: metaLeads.campaignName, total: count() })
      .from(metaLeads)
      .where(isNull(metaLeads.deletedAt))
      .groupBy(metaLeads.campaignName)
      .orderBy(desc(count()))
      .limit(10)

    return { byStatus, byCampaign }
  }

  async getRevenueBreakdown() {
    const byMonth = await this.db
      .select({ amount: bookings.amount, bookedAt: bookings.bookedAt })
      .from(bookings)
      .where(and(isNull(bookings.deletedAt), eq(bookings.status, 'confirmed')))
      .orderBy(desc(bookings.bookedAt))
      .limit(100)

    const recentBookings = await this.db.query.bookings.findMany({
      where: and(isNull(bookings.deletedAt)),
      with: { lead: true, property: true, assignedEmployee: true },
      orderBy: [desc(bookings.bookedAt)],
      limit: 10,
    })

    return { byMonth, recentBookings }
  }
}
