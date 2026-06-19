import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { eq, and } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { clients, metaLeads } from '@pikorua/db'
import { serializeMetaLead } from '../leads/lead.serializer'
import { serializeProfile } from '../../common/serializers/profile.serializer'

function serializeClient(client: any) {
  return {
    id: client.id,
    full_name: client.fullName ?? null,
    phone: client.phone ?? null,
    email: client.email ?? null,
    city: client.city ?? null,
    status: client.status ?? null,
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

  constructor(private readonly database: DatabaseService) {}

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
      leads: leads.map(serializeMetaLead),
    }
  }

  async updateStatus(id: string, updatedBy: string, status: string | null, statusNote?: string) {
    const client = await this.db.query.clients.findFirst({
      where: eq(clients.id, id),
      with: { statusUpdatedByProfile: true },
    })
    if (!client) throw new NotFoundException(`Client ${id} not found`)

    const wasСold = client.status === 'cold'
    const isCold = status === 'cold'

    await this.db
      .update(clients)
      .set({
        status: status ?? null,
        statusNote: statusNote ?? null,
        statusUpdatedBy: updatedBy,
        statusUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(clients.id, id))

    // Sync cold pool status on linked meta leads
    if (isCold && !wasСold) {
      // Mark all assigned leads for this client as cold_pool
      await this.db
        .update(metaLeads)
        .set({ status: 'cold_pool' as never })
        .where(and(
          eq(metaLeads.clientId, id),
          eq(metaLeads.status, 'assigned' as never),
        ))
    } else if (!isCold && wasСold) {
      // Move cold_pool leads back to assigned
      await this.db
        .update(metaLeads)
        .set({ status: 'assigned' as never })
        .where(and(
          eq(metaLeads.clientId, id),
          eq(metaLeads.status, 'cold_pool' as never),
        ))
    }

    this.logger.log(`Client ${id} status changed to '${status ?? 'none'}' by ${updatedBy}`)

    const full = await this.db.query.clients.findFirst({
      where: eq(clients.id, id),
      with: { statusUpdatedByProfile: true },
    })

    return { client: serializeClient(full) }
  }
}
