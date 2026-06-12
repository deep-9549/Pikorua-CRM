import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { eq, inArray, desc, and, isNull } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { metaLeads, userProfiles, clients } from '@pikorua/db'
import { AssignLeadDto } from './dto/assign-lead.dto'
import { BulkAssignDto } from './dto/bulk-assign.dto'
import { serializeMetaLead } from '../leads/lead.serializer'

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000'

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
    if (!user) throw new BadRequestException('Assigned user must be an active sales executive')
  }

  /**
   * Find or create a client record keyed by phone number, then link it to the
   * meta lead if not already linked. Returns the client id.
   */
  private async ensureClient(lead: { id: string; phone: string | null; fullName: string | null; email: string | null; clientId: string | null }): Promise<string | null> {
    if (!lead.phone) return null

    // Already linked — nothing to do
    if (lead.clientId) return lead.clientId

    const existing = await this.db.query.clients.findFirst({
      where: eq(clients.phone, lead.phone),
    })

    let clientId: string
    if (existing) {
      clientId = existing.id
    } else {
      const [inserted] = await this.db.insert(clients).values({
        tenantId: DEFAULT_TENANT_ID,
        fullName: lead.fullName,
        phone: lead.phone,
        email: lead.email,
      }).returning()
      clientId = inserted.id
    }

    await this.db
      .update(metaLeads)
      .set({ clientId, updatedAt: new Date() })
      .where(eq(metaLeads.id, lead.id))

    return clientId
  }

  async findAll(status: string | undefined, user: { id: string; role: string }) {
    const conditions = [isNull(metaLeads.deletedAt)]
    if (status) conditions.push(eq(metaLeads.status, status as never))
    // Sales executives may only ever see leads assigned to them.
    if (user.role !== 'super_admin') conditions.push(eq(metaLeads.assignedTo, user.id))

    const leads = await this.db.query.metaLeads.findMany({
      where: and(...conditions),
      with: { assignedToProfile: true, assignedByProfile: true, crmDetails: true },
      orderBy: [desc(metaLeads.receivedAt)],
    })

    // Build phone list for client status lookup (works even when clientId is not yet set)
    const phones = [...new Set(leads.map(l => l.phone).filter(Boolean))] as string[]
    const phoneClientMap = new Map<string, { status: string | null; statusNote: string | null }>()
    if (phones.length > 0) {
      const rows = await this.db.query.clients.findMany({
        where: inArray(clients.phone, phones),
      })
      for (const row of rows) {
        if (row.phone) phoneClientMap.set(row.phone, {
          status: row.status,
          statusNote: row.statusNote,
        })
      }
    }

    return {
      leads: leads.map(l => serializeMetaLead({
        ...l,
        clientStatus: l.phone ? (phoneClientMap.get(l.phone)?.status ?? null) : null,
        clientStatusNote: l.phone ? (phoneClientMap.get(l.phone)?.statusNote ?? null) : null,
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

    // Auto-create and link a client if the lead doesn't have one yet
    const clientId = await this.ensureClient(lead)

    // Fetch current client status (for the response)
    let clientStatus: string | null = null
    let clientStatusNote: string | null = null
    if (clientId) {
      const client = await this.db.query.clients.findFirst({
        where: eq(clients.id, clientId),
      })
      clientStatus = client?.status ?? null
      clientStatusNote = client?.statusNote ?? null
    }

    return { lead: serializeMetaLead({ ...lead, clientId, clientStatus, clientStatusNote }) }
  }

  async assign(id: string, assignedBy: string, dto: AssignLeadDto) {
    await this.findOne(id)
    await this.ensureAssignableSalesExecutive(dto.assigned_to)

    const [updated] = await this.db
      .update(metaLeads)
      .set({ assignedTo: dto.assigned_to, assignedBy, assignedAt: new Date(), status: 'assigned' })
      .where(eq(metaLeads.id, id))
      .returning()
    if (!updated) throw new NotFoundException(`Meta lead ${id} not found`)
    return this.findOne(id)
  }

  async bulkAssign(assignedBy: string, dto: BulkAssignDto) {
    await this.ensureAssignableSalesExecutive(dto.assigned_to)

    const updated = await this.db
      .update(metaLeads)
      .set({ assignedTo: dto.assigned_to, assignedBy, assignedAt: new Date(), status: 'assigned' })
      .where(inArray(metaLeads.id, dto.lead_ids))
      .returning()
    return { updated: updated.length }
  }

  async unassign(id: string) {
    await this.findOne(id)
    const [updated] = await this.db
      .update(metaLeads)
      .set({ assignedTo: null, assignedBy: null, assignedAt: null, status: 'unassigned', updatedAt: new Date() })
      .where(eq(metaLeads.id, id))
      .returning()
    if (!updated) throw new NotFoundException(`Meta lead ${id} not found`)
    return this.findOne(id)
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
