import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { eq, and, inArray, isNotNull, isNull } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { clients, metaLeads } from '@pikorua/db'
import { isAntiBrokerCompatibleStatus } from '@pikorua/shared'
import { serializeMetaLead } from '../leads/lead.serializer'
import { serializeProfile } from '../../common/serializers/profile.serializer'
import { LeadActivityService } from '../lead-activity/lead-activity.service'
import {
  META_LEAD_POOL_STATUSES,
  META_LEAD_QUEUE_MANAGED_STATUSES,
  poolStatusForClientStatus,
} from '../leads/lead-pools'

function serializeClient(client: any) {
  return {
    id: client.id,
    full_name: client.fullName ?? null,
    phone: client.phone ?? null,
    email: client.email ?? null,
    city: client.city ?? null,
    status: client.status ?? null,
    anti_broker: Boolean(client.antiBroker),
    status_note: client.statusNote ?? null,
    status_updated_by: client.statusUpdatedBy ?? null,
    status_updated_by_profile: serializeProfile(client.statusUpdatedByProfile),
    status_updated_at: client.statusUpdatedAt ?? null,
    tier: client.tier ?? null,
    first_seen_at: client.firstSeenAt ?? client.createdAt ?? null,
    last_seen_at: client.lastSeenAt ?? client.updatedAt ?? null,
    total_inquiries: client.totalInquiries ?? 0,
    created_at: client.createdAt ?? null,
    updated_at: client.updatedAt ?? null,
  }
}

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name)

  constructor(
    private readonly database: DatabaseService,
    private readonly leadActivityService: LeadActivityService,
  ) {}

  private get db() { return this.database.db }

  async findOne(id: string) {
    // The client row and its lead history are independent reads — run them in
    // parallel so we pay one round-trip of latency instead of two.
    const [client, leads] = await Promise.all([
      this.db.query.clients.findFirst({
        where: eq(clients.id, id),
        with: { statusUpdatedByProfile: true },
      }),
      this.db.query.metaLeads.findMany({
        where: eq(metaLeads.clientId, id),
        with: { assignedToProfile: true, crmDetails: true },
        orderBy: (t, { desc }) => [desc(t.receivedAt)],
      }),
    ])
    if (!client) throw new NotFoundException(`Client ${id} not found`)

    // Compute derived fields from leads
    const firstLead = leads[leads.length - 1]
    const lastLead = leads[0]
    const firstCity = lastLead?.city ?? null

    const enriched = {
      ...client,
      city: firstCity,
      firstSeenAt: firstLead?.receivedAt ?? client.createdAt,
      lastSeenAt: lastLead?.receivedAt ?? client.updatedAt,
      totalInquiries: leads.length,
    }

    return {
      client: serializeClient(enriched),
      leads: leads.map(lead => serializeMetaLead({
        ...lead,
        clientStatus: client.status,
        clientStatusNote: client.statusNote,
        clientAntiBroker: client.antiBroker,
      })),
    }
  }

  async updateStatus(
    id: string,
    updatedBy: string,
    input: { status?: string | null; status_note?: string; anti_broker?: boolean },
  ) {
    const client = await this.db.query.clients.findFirst({
      where: eq(clients.id, id),
      with: { statusUpdatedByProfile: true },
    })
    if (!client) throw new NotFoundException(`Client ${id} not found`)

    const status = input.status === undefined ? client.status ?? null : input.status
    const statusNote = input.status_note === undefined ? client.statusNote ?? null : input.status_note
    if (input.anti_broker === true && !isAntiBrokerCompatibleStatus(status)) {
      throw new BadRequestException('Anti-Broker can only be combined with Hot, Warm, or Cold')
    }
    const antiBroker = isAntiBrokerCompatibleStatus(status)
      ? input.anti_broker ?? Boolean(client.antiBroker)
      : false

    await this.db
      .update(clients)
      .set({
        status: status ?? null,
        statusNote: statusNote ?? null,
        antiBroker,
        statusUpdatedBy: updatedBy,
        statusUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(clients.id, id))

    const changes = this.leadActivityService.diff(
      { status: client.status ?? null, status_note: client.statusNote ?? null, anti_broker: Boolean(client.antiBroker) },
      { status: status ?? null, status_note: statusNote ?? null, anti_broker: antiBroker },
      { status: 'Client Status', status_note: 'Client Status Note', anti_broker: 'Anti-Broker' },
    )

    const previousPoolStatus = poolStatusForClientStatus(client.status)
    const nextPoolStatus = poolStatusForClientStatus(status)

    // Sync queue pool status on linked meta leads. Converted/rejected rows stay
    // terminal; active queue rows move in/out of pools with the client status.
    if (nextPoolStatus) {
      await this.db
        .update(metaLeads)
        .set({ status: nextPoolStatus as never, updatedAt: new Date() })
        .where(and(
          eq(metaLeads.clientId, id),
          inArray(metaLeads.status, META_LEAD_QUEUE_MANAGED_STATUSES as never),
        ))
    } else if (previousPoolStatus) {
      await this.db
        .update(metaLeads)
        .set({ status: 'assigned' as never, updatedAt: new Date() })
        .where(and(
          eq(metaLeads.clientId, id),
          inArray(metaLeads.status, META_LEAD_POOL_STATUSES as never),
          isNotNull(metaLeads.assignedTo),
        ))

      await this.db
        .update(metaLeads)
        .set({ status: 'unassigned' as never, updatedAt: new Date() })
        .where(and(
          eq(metaLeads.clientId, id),
          inArray(metaLeads.status, META_LEAD_POOL_STATUSES as never),
          isNull(metaLeads.assignedTo),
        ))
    }

    this.logger.log(`Client ${id} status changed to '${status ?? 'none'}' by ${updatedBy}`)

    if (Object.keys(changes).length > 0) {
      const linkedLeads = await this.db.query.metaLeads.findMany({
        where: eq(metaLeads.clientId, id),
        columns: { id: true },
      })

      for (const lead of linkedLeads) {
        await this.leadActivityService.record({
          leadId: lead.id,
          actorUserId: updatedBy,
          eventType: 'client_status_updated',
          source: 'client_status',
          title: 'Client status updated',
          description: 'Client status was changed from the lead detail page.',
          changes,
          metadata: { client_id: id },
        })
      }
    }

    const full = await this.db.query.clients.findFirst({
      where: eq(clients.id, id),
      with: { statusUpdatedByProfile: true },
    })

    return { client: serializeClient(full) }
  }
}
