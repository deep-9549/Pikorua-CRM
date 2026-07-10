import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { eq, inArray, desc, and, isNull, notInArray } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { metaLeads, userProfiles, clients, properties } from '@pikorua/db'
import { AssignLeadDto } from './dto/assign-lead.dto'
import { BulkAssignDto } from './dto/bulk-assign.dto'
import { serializeMetaLead, serializeCrmDetails } from '../leads/lead.serializer'
import { ClientsService } from '../clients/clients.service'
import { LeadActivityService } from '../lead-activity/lead-activity.service'
import {
  buildPropertyRecommendations,
  PropertyRecommendationInput,
} from '../properties/property-recommendation.matcher'
import {
  META_LEAD_POOL_STATUSES,
  META_LEAD_QUEUE_MANAGED_STATUSES,
  isNonTransferableMetaLeadPoolStatus,
  poolStatusForClientStatus,
} from '../leads/lead-pools'

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000'

@Injectable()
export class MetaLeadsService {
  private readonly logger = new Logger(MetaLeadsService.name)

  constructor(
    private readonly database: DatabaseService,
    private readonly clientsService: ClientsService,
    private readonly leadActivityService: LeadActivityService,
  ) {}

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
  private async ensureClient(lead: { id: string; phone: string | null; fullName: string | null; email: string | null; clientId: string | null; status: string }): Promise<string | null> {
    if (!lead.phone) return null

    // Already linked — nothing to do
    if (lead.clientId) return lead.clientId

    const existing = await this.db.query.clients.findFirst({
      where: eq(clients.phone, lead.phone),
    })

    let clientId: string
    let nextLeadStatus: string | null = null
    if (existing) {
      clientId = existing.id
      nextLeadStatus = poolStatusForClientStatus(existing.status)
    } else {
      const [inserted] = await this.db.insert(clients).values({
        tenantId: DEFAULT_TENANT_ID,
        fullName: lead.fullName,
        phone: lead.phone,
        email: lead.email,
      }).returning()
      clientId = inserted.id
    }

    const shouldPoolLead = nextLeadStatus
      && META_LEAD_QUEUE_MANAGED_STATUSES.includes(lead.status as never)

    await this.db
      .update(metaLeads)
      .set({
        clientId,
        ...(shouldPoolLead ? { status: nextLeadStatus as never } : {}),
        updatedAt: new Date(),
      })
      .where(eq(metaLeads.id, lead.id))

    return clientId
  }

  async findAll(status: string | undefined, user: { id: string; role: string }, includePools = false) {
    const conditions = [isNull(metaLeads.deletedAt)]
    if (status) conditions.push(eq(metaLeads.status, status as never))
    else if (!includePools) conditions.push(notInArray(metaLeads.status, META_LEAD_POOL_STATUSES as never))
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

  /**
   * Everything the lead detail page needs in a single request: the lead (with
   * CRM, notes, interactions), its client profile, and the client's full lead
   * history. Replaces the old three sequential browser round-trips
   * (/meta/:id + /meta/:id/crm + /clients/:id).
   */
  async detail(id: string) {
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

    // Link a client if needed (cheap no-op once the lead is already linked).
    const clientId = await this.ensureClient(lead)

    let client: unknown = null
    let history: unknown[] = []
    let clientStatus: string | null = null
    let clientStatusNote: string | null = null
    if (clientId) {
      // A missing client shouldn't take down the whole lead page — degrade to
      // showing the lead without its profile/history (matches the old behaviour).
      try {
        const profile = await this.clientsService.findOne(clientId)
        client = profile.client
        history = profile.leads
        clientStatus = profile.client?.status ?? null
        clientStatusNote = profile.client?.status_note ?? null
      } catch (error) {
        // Degrade gracefully, but record why so a DB/network failure is
        // distinguishable from a genuinely missing client.
        const message = error instanceof Error ? error.message : String(error)
        this.logger.warn(`Client lookup failed for lead ${id} (client ${clientId}): ${message}`)
        client = null
        history = []
      }
    }

    return {
      lead: serializeMetaLead({ ...lead, clientId, clientStatus, clientStatusNote }),
      crm: serializeCrmDetails(lead.crmDetails),
      client,
      history,
      activity: await this.leadActivityService.getLeadActivity(id),
    }
  }

  async propertyRecommendations(id: string, input: PropertyRecommendationInput) {
    const lead = await this.db.query.metaLeads.findFirst({
      where: and(eq(metaLeads.id, id), isNull(metaLeads.deletedAt)),
      with: {
        assignedToProfile: true,
        assignedByProfile: true,
        crmDetails: true,
      },
    })
    if (!lead) throw new NotFoundException(`Meta lead ${id} not found`)

    const propertyRows = await this.db.query.properties.findMany({
      where: isNull(properties.deletedAt),
      with: {
        images: true,
        amenities: true,
        appreciation: true,
      },
    })

    const recommendations = buildPropertyRecommendations(propertyRows as any[], {
      budgetRange: input.budgetRange ?? lead.crmDetails?.budgetRange ?? null,
      configuration: input.configuration ?? lead.crmDetails?.configuration ?? null,
      preferredLocations: input.preferredLocations ?? (lead.crmDetails as any)?.preferredLocations ?? null,
      currentArea: input.currentArea ?? lead.crmDetails?.currentArea ?? null,
      currentCity: input.currentCity ?? lead.crmDetails?.currentCity ?? null,
      leadCity: input.leadCity ?? lead.city ?? null,
      limit: input.limit ?? 3,
    })

    return {
      lead: serializeMetaLead(lead),
      recommendations,
    }
  }

  async assign(id: string, assignedBy: string, dto: AssignLeadDto) {
    const existing = await this.db.query.metaLeads.findFirst({
      where: and(eq(metaLeads.id, id), isNull(metaLeads.deletedAt)),
      with: { assignedToProfile: true },
    })
    if (!existing) throw new NotFoundException(`Meta lead ${id} not found`)
    if (isNonTransferableMetaLeadPoolStatus(existing.status)) {
      throw new BadRequestException('Leads in lost, not interested, broker, or construction owner pools cannot be assigned or transferred')
    }
    await this.ensureAssignableSalesExecutive(dto.assigned_to)
    const assignee = await this.db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, dto.assigned_to),
    })

    const [updated] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(metaLeads)
        .set({ assignedTo: dto.assigned_to, assignedBy, assignedAt: new Date(), status: 'assigned', updatedAt: new Date() })
        .where(eq(metaLeads.id, id))
        .returning()

      const fromName = existing.assignedToProfile?.fullName ?? null
      const isTransfer = Boolean(existing.assignedTo && existing.assignedTo !== dto.assigned_to)

      await this.leadActivityService.record({
        leadId: id,
        actorUserId: assignedBy,
        eventType: isTransfer ? 'transferred' : 'assigned',
        source: 'manual',
        title: isTransfer ? 'Lead transferred' : 'Lead assigned',
        description: isTransfer ? 'Lead ownership was moved to another sales executive.' : 'Lead was assigned to a sales executive.',
        fromUserId: existing.assignedTo ?? null,
        fromUserName: fromName,
        toUserId: dto.assigned_to,
        changes: {
          assigned_to: { label: 'Assigned To', from: fromName, to: assignee?.fullName ?? assignee?.email ?? dto.assigned_to },
        },
      }, tx)

      return rows
    })
    if (!updated) throw new NotFoundException(`Meta lead ${id} not found`)
    this.logger.log(`Lead ${id} assigned to ${dto.assigned_to} by ${assignedBy}`)
    return this.findOne(id)
  }

  async bulkAssign(assignedBy: string, dto: BulkAssignDto) {
    await this.ensureAssignableSalesExecutive(dto.assigned_to)
    const assignee = await this.db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, dto.assigned_to),
    })

    const updated = await this.db.transaction(async (tx) => {
      const existing = await tx.query.metaLeads.findMany({
        where: and(inArray(metaLeads.id, dto.lead_ids), isNull(metaLeads.deletedAt)),
        with: { assignedToProfile: true },
      })

      if (existing.some((lead) => isNonTransferableMetaLeadPoolStatus(lead.status))) {
        throw new BadRequestException('Selected leads include lost, not interested, broker, or construction owner pool leads that cannot be assigned or transferred')
      }

      const rows = await tx
        .update(metaLeads)
        .set({ assignedTo: dto.assigned_to, assignedBy, assignedAt: new Date(), status: 'assigned', updatedAt: new Date() })
        .where(and(inArray(metaLeads.id, dto.lead_ids), isNull(metaLeads.deletedAt)))
        .returning()

      for (const lead of existing) {
        const fromName = lead.assignedToProfile?.fullName ?? null
        const isTransfer = Boolean(lead.assignedTo && lead.assignedTo !== dto.assigned_to)
        await this.leadActivityService.record({
          leadId: lead.id,
          actorUserId: assignedBy,
          eventType: isTransfer ? 'transferred' : 'assigned',
          source: 'bulk',
          title: isTransfer ? 'Lead transferred in bulk' : 'Lead assigned in bulk',
          description: isTransfer ? 'Lead ownership was moved by a bulk action.' : 'Lead was assigned by a bulk action.',
          fromUserId: lead.assignedTo ?? null,
          fromUserName: fromName,
          toUserId: dto.assigned_to,
          changes: {
            assigned_to: { label: 'Assigned To', from: fromName, to: assignee?.fullName ?? assignee?.email ?? dto.assigned_to },
          },
          metadata: { bulk_count: dto.lead_ids.length },
        }, tx)
      }

      return rows
    })
    this.logger.log(`Bulk-assigned ${updated.length} lead(s) to ${dto.assigned_to} by ${assignedBy}`)
    return { updated: updated.length }
  }

  async unassign(id: string, actorUserId: string) {
    const existing = await this.db.query.metaLeads.findFirst({
      where: and(eq(metaLeads.id, id), isNull(metaLeads.deletedAt)),
      with: { assignedToProfile: true },
    })
    if (!existing) throw new NotFoundException(`Meta lead ${id} not found`)
    if (isNonTransferableMetaLeadPoolStatus(existing.status)) {
      throw new BadRequestException('Leads in lost, not interested, broker, or construction owner pools cannot be returned to the lead queue')
    }

    const [updated] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(metaLeads)
        .set({ assignedTo: null, assignedBy: null, assignedAt: null, status: 'unassigned', updatedAt: new Date() })
        .where(eq(metaLeads.id, id))
        .returning()

      const fromName = existing.assignedToProfile?.fullName ?? null
      await this.leadActivityService.record({
        leadId: id,
        actorUserId,
        eventType: 'unassigned',
        source: 'manual',
        title: 'Lead unassigned',
        description: 'Lead was returned to the unassigned queue.',
        fromUserId: existing.assignedTo ?? null,
        fromUserName: fromName,
        changes: {
          assigned_to: { label: 'Assigned To', from: fromName, to: null },
        },
      }, tx)

      return rows
    })
    if (!updated) throw new NotFoundException(`Meta lead ${id} not found`)
    this.logger.log(`Lead ${id} unassigned`)
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
