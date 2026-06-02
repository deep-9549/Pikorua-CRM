import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, inArray, desc, and, isNull } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { metaLeads } from '@pikorua/db'
import { AssignLeadDto } from './dto/assign-lead.dto'
import { BulkAssignDto } from './dto/bulk-assign.dto'

@Injectable()
export class MetaLeadsService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  async findAll(status?: string) {
    const conditions = [isNull(metaLeads.deletedAt)]
    if (status) conditions.push(eq(metaLeads.status, status as never))

    return this.db.query.metaLeads.findMany({
      where: and(...conditions),
      with: {
        assignedToProfile: true,
        assignedByProfile: true,
        crmDetails: true,
      },
      orderBy: [desc(metaLeads.receivedAt)],
    })
  }

  async findOne(id: string) {
    const lead = await this.db.query.metaLeads.findFirst({
      where: and(eq(metaLeads.id, id), isNull(metaLeads.deletedAt)),
      with: {
        assignedToProfile: true,
        assignedByProfile: true,
        crmDetails: true,
        notes: true,
        interactions: true,
      },
    })
    if (!lead) throw new NotFoundException(`Meta lead ${id} not found`)
    return lead
  }

  async assign(id: string, assignedBy: string, dto: AssignLeadDto) {
    await this.findOne(id)
    const [updated] = await this.db
      .update(metaLeads)
      .set({
        assignedTo: dto.assigned_to,
        assignedBy,
        assignedAt: new Date(),
        status: 'assigned',
      })
      .where(eq(metaLeads.id, id))
      .returning()
    return updated
  }

  async bulkAssign(assignedBy: string, dto: BulkAssignDto) {
    const updated = await this.db
      .update(metaLeads)
      .set({
        assignedTo: dto.assigned_to,
        assignedBy,
        assignedAt: new Date(),
        status: 'assigned',
      })
      .where(inArray(metaLeads.id, dto.lead_ids))
      .returning()
    return { updated: updated.length }
  }

  async convertToCrm(id: string) {
    await this.findOne(id)
    const [updated] = await this.db
      .update(metaLeads)
      .set({ status: 'converted', updatedAt: new Date() })
      .where(eq(metaLeads.id, id))
      .returning()
    return updated
  }

  async reject(id: string) {
    await this.findOne(id)
    const [updated] = await this.db
      .update(metaLeads)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(metaLeads.id, id))
      .returning()
    return updated
  }
}
