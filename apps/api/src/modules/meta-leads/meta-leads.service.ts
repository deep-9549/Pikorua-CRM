import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { eq, inArray, desc, and, isNull } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { metaLeads, userProfiles } from '@pikorua/db'
import { AssignLeadDto } from './dto/assign-lead.dto'
import { BulkAssignDto } from './dto/bulk-assign.dto'
import { serializeMetaLead } from '../leads/lead.serializer'

@Injectable()
export class MetaLeadsService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  private async ensureAssignableSalesExecutive(userId: string) {
    const user = await this.db.query.userProfiles.findFirst({
      where: and(
        eq(userProfiles.id, userId),
        eq(userProfiles.role, 'sales_executive'),
        eq(userProfiles.status, 'active'),
        isNull(userProfiles.deletedAt),
      ),
    })

    if (!user) {
      throw new BadRequestException('Assigned user must be an active sales executive')
    }
  }

  async findAll(status?: string) {
    const conditions = [isNull(metaLeads.deletedAt)]
    if (status) conditions.push(eq(metaLeads.status, status as never))

    const leads = await this.db.query.metaLeads.findMany({
      where: and(...conditions),
      with: {
        assignedToProfile: true,
        assignedByProfile: true,
        crmDetails: true,
      },
      orderBy: [desc(metaLeads.receivedAt)],
    })

    return { leads: leads.map(serializeMetaLead) }
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
    return { lead: serializeMetaLead(lead) }
  }

  async assign(id: string, assignedBy: string, dto: AssignLeadDto) {
    await this.findOne(id)
    await this.ensureAssignableSalesExecutive(dto.assigned_to)

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
    if (!updated) throw new NotFoundException(`Meta lead ${id} not found`)
    return this.findOne(id)
  }

  async bulkAssign(assignedBy: string, dto: BulkAssignDto) {
    await this.ensureAssignableSalesExecutive(dto.assigned_to)

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
    return { lead: serializeMetaLead(updated) }
  }

  async reject(id: string) {
    await this.findOne(id)
    const [updated] = await this.db
      .update(metaLeads)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(metaLeads.id, id))
      .returning()
    return { lead: serializeMetaLead(updated) }
  }
}
