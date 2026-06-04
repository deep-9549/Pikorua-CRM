import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { eq, inArray, desc, and, isNull, sql } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { metaLeads, userProfiles, clients } from '@pikorua/db'
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

    // Batch-fetch client statuses for leads that have a clientId
    const clientIds = [...new Set(leads.map(l => l.clientId).filter(Boolean))] as string[]
    const clientStatusMap = new Map<string, string | null>()
    if (clientIds.length > 0) {
      const rows = await this.db.execute(
        sql`SELECT id::text AS id, status FROM clients WHERE id::text = ANY(${clientIds})`
      ) as Array<{ id: string; status: string | null }>
      for (const row of rows) clientStatusMap.set(row.id, row.status)
    }

    return {
      leads: leads.map(l => serializeMetaLead({
        ...l,
        clientStatus: clientStatusMap.get(l.clientId ?? '') ?? null,
      })),
    }
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

    let clientStatus: string | null = null
    if (lead.clientId) {
      const rows = await this.db.execute(
        sql`SELECT status FROM clients WHERE id::text = ${lead.clientId} LIMIT 1`
      ) as Array<{ status: string | null }>
      clientStatus = rows[0]?.status ?? null
    }

    return { lead: serializeMetaLead({ ...lead, clientStatus }) }
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
