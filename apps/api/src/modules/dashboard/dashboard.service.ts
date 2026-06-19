import { Injectable } from '@nestjs/common'
import { eq, count, sum, desc, and, isNull } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { metaLeads, bookings, siteVisits } from '@pikorua/db'

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
}
