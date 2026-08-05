import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { eq, inArray, desc, and, or, isNull, isNotNull, notInArray, gte, lt } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { metaLeads, userProfiles, clients, properties, leadFollowUps } from '@pikorua/db'
import { AssignLeadDto } from './dto/assign-lead.dto'
import { BulkAssignDto } from './dto/bulk-assign.dto'
import { SplitAssignDto } from './dto/split-assign.dto'
import { BulkLeadIdsDto } from '../leads/dto/bulk-lead-ids.dto'
import { serializeMetaLead, serializeCrmDetails } from '../leads/lead.serializer'
import { serializeProfile } from '../../common/serializers/profile.serializer'
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

function todayIstUtcRange(now = new Date()) {
  const istOffsetMs = 5.5 * 60 * 60 * 1000
  const shifted = new Date(now.getTime() + istOffsetMs)
  const start = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - istOffsetMs)
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) }
}

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

  async findAll(
    status: string | undefined,
    user: { id: string; role: string },
    options: { includePools?: boolean; trash?: boolean } = {},
  ) {
    const conditions = [isNull(metaLeads.deletedAt)]
    if (options.trash) conditions.push(inArray(metaLeads.status, META_LEAD_POOL_STATUSES as never))
    else if (status) conditions.push(eq(metaLeads.status, status as never))
    else if (!options.includePools) conditions.push(notInArray(metaLeads.status, META_LEAD_POOL_STATUSES as never))
    // Sales executives may only ever see leads assigned to them.
    if (!options.trash && user.role !== 'super_admin') conditions.push(eq(metaLeads.assignedTo, user.id))

    const leads = await this.db.query.metaLeads.findMany({
      where: and(...conditions),
      with: { assignedToProfile: true, assignedByProfile: true, crmDetails: true },
      orderBy: [desc(metaLeads.receivedAt)],
    })

    // Build phone list for client status lookup (works even when clientId is not yet set)
    const phones = [...new Set(leads.map(l => l.phone).filter(Boolean))] as string[]
    const phoneClientMap = new Map<string, { status: string | null; statusNote: string | null; antiBroker: boolean }>()
    if (phones.length > 0) {
      const rows = await this.db.query.clients.findMany({
        where: inArray(clients.phone, phones),
      })
      for (const row of rows) {
        if (row.phone) phoneClientMap.set(row.phone, {
          status: row.status,
          statusNote: row.statusNote,
          antiBroker: Boolean(row.antiBroker),
        })
      }
    }

    // Completed follow-ups are real call attempts. Return today's entries with
    // the lead list so the leads page can count each attempt from its own log
    // instead of reusing the lead's single current call_status value.
    const followUpCallsByLead = new Map<string, unknown[]>()
    const leadIds = leads.map(lead => lead.id)
    if (leadIds.length > 0 && !options.trash) {
      const { start, end } = todayIstUtcRange()
      const calls = await this.db.query.leadFollowUps.findMany({
        where: and(
          inArray(leadFollowUps.leadId, leadIds),
          eq(leadFollowUps.status, 'completed'),
          isNotNull(leadFollowUps.callStatus),
          gte(leadFollowUps.completedAt, start),
          lt(leadFollowUps.completedAt, end),
        ),
        with: { completedByProfile: true },
        orderBy: [desc(leadFollowUps.completedAt)],
      })
      for (const call of calls) {
        const entries = followUpCallsByLead.get(call.leadId) ?? []
        entries.push({
          id: call.id,
          call_status: call.callStatus,
          completed_at: call.completedAt,
          completed_by_profile: serializeProfile(call.completedByProfile),
        })
        followUpCallsByLead.set(call.leadId, entries)
      }
    }

    return {
      leads: leads.map(l => ({
        ...serializeMetaLead({
          ...l,
          clientStatus: l.phone ? (phoneClientMap.get(l.phone)?.status ?? null) : null,
          clientStatusNote: l.phone ? (phoneClientMap.get(l.phone)?.statusNote ?? null) : null,
          clientAntiBroker: l.phone ? (phoneClientMap.get(l.phone)?.antiBroker ?? false) : false,
        }),
        today_follow_up_calls: followUpCallsByLead.get(l.id) ?? [],
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
        followUps: {
          with: { creator: true, completedByProfile: true },
          orderBy: (followUps, { desc: orderDesc }) => [orderDesc(followUps.scheduledAt)],
        },
      },
    })
    if (!lead) throw new NotFoundException(`Meta lead ${id} not found`)

    // Auto-create and link a client if the lead doesn't have one yet
    const clientId = await this.ensureClient(lead)

    // Fetch current client status (for the response)
    let clientStatus: string | null = null
    let clientStatusNote: string | null = null
    let clientAntiBroker = false
    if (clientId) {
      const client = await this.db.query.clients.findFirst({
        where: eq(clients.id, clientId),
      })
      clientStatus = client?.status ?? null
      clientStatusNote = client?.statusNote ?? null
      clientAntiBroker = Boolean(client?.antiBroker)
    }

    return { lead: serializeMetaLead({ ...lead, clientId, clientStatus, clientStatusNote, clientAntiBroker }) }
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
        followUps: {
          with: { creator: true, completedByProfile: true },
          orderBy: (followUps, { desc: orderDesc }) => [orderDesc(followUps.scheduledAt)],
        },
      },
    })
    if (!lead) throw new NotFoundException(`Meta lead ${id} not found`)

    // Link a client if needed (cheap no-op once the lead is already linked).
    const clientId = await this.ensureClient(lead)

    let client: unknown = null
    let history: unknown[] = []
    let clientStatus: string | null = null
    let clientStatusNote: string | null = null
    let clientAntiBroker = false
    if (clientId) {
      // A missing client shouldn't take down the whole lead page — degrade to
      // showing the lead without its profile/history (matches the old behaviour).
      try {
        const profile = await this.clientsService.findOne(clientId)
        client = profile.client
        history = profile.leads
        clientStatus = profile.client?.status ?? null
        clientStatusNote = profile.client?.status_note ?? null
        clientAntiBroker = Boolean(profile.client?.anti_broker)
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
      lead: serializeMetaLead({ ...lead, clientId, clientStatus, clientStatusNote, clientAntiBroker }),
      crm: serializeCrmDetails(lead.crmDetails),
      client,
      history,
      activity: await this.leadActivityService.getLeadActivity(id),
      follow_ups: lead.followUps.map((item) => ({
        id: item.id,
        lead_id: item.leadId,
        scheduled_at: item.scheduledAt,
        status: item.status,
        call_status: item.callStatus ?? null,
        notes: item.notes ?? null,
        outcome_remarks: item.outcomeRemarks ?? null,
        completed_at: item.completedAt ?? null,
        created_by_name: item.creator?.fullName ?? null,
        completed_by_name: item.completedByProfile?.fullName ?? null,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      })),
    }
  }

  async markAssignmentViewed(id: string, userId: string) {
    const viewedAt = new Date()
    const [updated] = await this.db
      .update(metaLeads)
      .set({ assignmentViewedAt: viewedAt })
      .where(and(
        eq(metaLeads.id, id),
        eq(metaLeads.assignedTo, userId),
        isNull(metaLeads.deletedAt),
        isNotNull(metaLeads.assignedAt),
        or(
          isNull(metaLeads.assignmentViewedAt),
          lt(metaLeads.assignmentViewedAt, metaLeads.assignedAt),
        ),
      ))
      .returning({ assignmentViewedAt: metaLeads.assignmentViewedAt })

    return updated?.assignmentViewedAt ?? null
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
      throw new BadRequestException('Leads in trash cannot be assigned or transferred')
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
        throw new BadRequestException('Selected leads include trash leads that cannot be assigned or transferred')
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

  async splitAssign(assignedBy: string, dto: SplitAssignDto) {
    const assignees = await this.db.query.userProfiles.findMany({
      where: and(
        inArray(userProfiles.id, dto.assigned_to_ids),
        eq(userProfiles.role, 'sales_executive'),
        eq(userProfiles.status, 'active'),
        isNull(userProfiles.deletedAt),
      ),
    })

    if (assignees.length !== dto.assigned_to_ids.length) {
      throw new BadRequestException('All selected users must be active sales executives')
    }

    const assigneeById = new Map(assignees.map(assignee => [assignee.id, assignee]))
    const result = await this.db.transaction(async (tx) => {
      const existing = await tx.query.metaLeads.findMany({
        where: and(inArray(metaLeads.id, dto.lead_ids), isNull(metaLeads.deletedAt)),
      })

      if (existing.length !== dto.lead_ids.length) {
        throw new BadRequestException('One or more selected leads no longer exist')
      }
      if (existing.some(lead => lead.status !== 'unassigned' || lead.assignedTo)) {
        throw new BadRequestException('Only currently unassigned leads can be split')
      }

      const leadById = new Map(existing.map(lead => [lead.id, lead]))
      const orderedLeads = dto.lead_ids.map(id => leadById.get(id)!)
      const counts: Record<string, number> = Object.fromEntries(
        dto.assigned_to_ids.map(id => [id, 0]),
      )
      const assignedAt = new Date()
      const assignmentByLeadId = new Map<string, string>()

      for (let index = 0; index < orderedLeads.length; index += 1) {
        const lead = orderedLeads[index]
        const assigneeId = dto.assigned_to_ids[index % dto.assigned_to_ids.length]
        assignmentByLeadId.set(lead.id, assigneeId)
        counts[assigneeId] += 1
      }

      for (const assigneeId of dto.assigned_to_ids) {
        const assignedLeadIds = orderedLeads
          .filter(lead => assignmentByLeadId.get(lead.id) === assigneeId)
          .map(lead => lead.id)
        if (assignedLeadIds.length === 0) continue

        const rows = await tx
          .update(metaLeads)
          .set({
            assignedTo: assigneeId,
            assignedBy,
            assignedAt,
            status: 'assigned',
            updatedAt: assignedAt,
          })
          .where(and(
            inArray(metaLeads.id, assignedLeadIds),
            eq(metaLeads.status, 'unassigned'),
            isNull(metaLeads.assignedTo),
            isNull(metaLeads.deletedAt),
          ))
          .returning({ id: metaLeads.id })

        if (rows.length !== assignedLeadIds.length) {
          throw new BadRequestException('The lead queue changed while it was being split. Please refresh and try again')
        }
      }

      for (const lead of orderedLeads) {
        const assigneeId = assignmentByLeadId.get(lead.id)!
        const assignee = assigneeById.get(assigneeId)!
        await this.leadActivityService.record({
          leadId: lead.id,
          actorUserId: assignedBy,
          eventType: 'assigned',
          source: 'bulk',
          title: 'Lead assigned by equal split',
          description: 'Lead was distributed as part of an equal split.',
          toUserId: assigneeId,
          changes: {
            assigned_to: { label: 'Assigned To', from: null, to: assignee.fullName ?? assignee.email ?? assigneeId },
          },
          metadata: {
            split_count: dto.lead_ids.length,
            executive_count: dto.assigned_to_ids.length,
          },
        }, tx)
      }

      return { updated: orderedLeads.length, counts }
    })

    this.logger.log(`Split ${result.updated} lead(s) between ${dto.assigned_to_ids.length} executive(s) by ${assignedBy}`)
    return result
  }

  async unassign(id: string, actorUserId: string) {
    const existing = await this.db.query.metaLeads.findFirst({
      where: and(eq(metaLeads.id, id), isNull(metaLeads.deletedAt)),
      with: { assignedToProfile: true },
    })
    if (!existing) throw new NotFoundException(`Meta lead ${id} not found`)
    if (isNonTransferableMetaLeadPoolStatus(existing.status)) {
      throw new BadRequestException('Trash leads return to the lead queue only after their client status changes')
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

  async bulkUnassign(actorUserId: string, dto: BulkLeadIdsDto) {
    const result = await this.db.transaction(async (tx) => {
      const existing = await tx.query.metaLeads.findMany({
        where: and(inArray(metaLeads.id, dto.lead_ids), isNull(metaLeads.deletedAt)),
        with: { assignedToProfile: true },
      })

      if (existing.length !== dto.lead_ids.length) {
        throw new BadRequestException('One or more selected leads no longer exist')
      }
      if (existing.some(lead => lead.status !== 'assigned' || !lead.assignedTo)) {
        throw new BadRequestException('Only currently assigned leads can be unassigned in bulk')
      }

      const updatedAt = new Date()
      const rows = await tx
        .update(metaLeads)
        .set({ assignedTo: null, assignedBy: null, assignedAt: null, status: 'unassigned', updatedAt })
        .where(and(
          inArray(metaLeads.id, dto.lead_ids),
          eq(metaLeads.status, 'assigned'),
          isNotNull(metaLeads.assignedTo),
          isNull(metaLeads.deletedAt),
        ))
        .returning({ id: metaLeads.id })

      if (rows.length !== dto.lead_ids.length) {
        throw new BadRequestException('The assigned lead queue changed. Please refresh and try again')
      }

      for (const lead of existing) {
        const fromName = lead.assignedToProfile?.fullName ?? null
        await this.leadActivityService.record({
          leadId: lead.id,
          actorUserId,
          eventType: 'unassigned',
          source: 'bulk',
          title: 'Lead unassigned in bulk',
          description: 'Lead was returned to the unassigned queue by a bulk action.',
          fromUserId: lead.assignedTo,
          fromUserName: fromName,
          changes: {
            assigned_to: { label: 'Assigned To', from: fromName, to: null },
          },
          metadata: { bulk_count: dto.lead_ids.length },
        }, tx)
      }

      return rows.length
    })

    this.logger.log(`Bulk-unassigned ${result} lead(s) by ${actorUserId}`)
    return { updated: result }
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
