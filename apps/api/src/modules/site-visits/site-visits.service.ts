import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, desc, isNull, and } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { siteVisits } from '@pikorua/db'
import { CreateSiteVisitDto } from './dto/create-site-visit.dto'
import { UpdateSiteVisitDto } from './dto/update-site-visit.dto'

@Injectable()
export class SiteVisitsService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  async findAll(status?: string) {
    const conditions = [isNull(siteVisits.deletedAt)]
    if (status) conditions.push(eq(siteVisits.status, status as never))

    return this.db.query.siteVisits.findMany({
      where: and(...conditions),
      with: {
        lead: true,
        property: true,
        employee: true,
      },
      orderBy: [desc(siteVisits.scheduledDate)],
    })
  }

  async create(dto: CreateSiteVisitDto) {
    const [visit] = await this.db.insert(siteVisits).values({
      tenantId: '00000000-0000-0000-0000-000000000000', // resolved from auth context in production
      leadId: dto.lead_id,
      employeeId: dto.employee_id,
      propertyId: dto.property_id ?? null,
      scheduledDate: new Date(dto.scheduled_date),
      notes: dto.notes ?? null,
      status: 'scheduled',
    }).returning()
    return visit
  }

  async update(id: string, dto: UpdateSiteVisitDto) {
    const visit = await this.db.query.siteVisits.findFirst({
      where: and(eq(siteVisits.id, id), isNull(siteVisits.deletedAt)),
    })
    if (!visit) throw new NotFoundException(`Site visit ${id} not found`)

    const [updated] = await this.db
      .update(siteVisits)
      .set({
        ...(dto.status !== undefined && { status: dto.status as never }),
        ...(dto.feedback !== undefined && { feedback: dto.feedback }),
        ...(dto.rating !== undefined && { rating: dto.rating }),
        updatedAt: new Date(),
      })
      .where(eq(siteVisits.id, id))
      .returning()
    return updated
  }
}
