import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, isNull } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { clients, metaLeads } from '@pikorua/db'
import { serializeMetaLead } from '../leads/lead.serializer'

function serializeClient(client: typeof clients.$inferSelect) {
  return {
    id: client.id,
    full_name: client.fullName,
    phone: client.phone,
    email: client.email,
    status: client.status,
    status_note: client.statusNote,
    status_updated_by: client.statusUpdatedBy,
    status_updated_at: client.statusUpdatedAt,
    tier: client.tier,
    created_at: client.createdAt,
    updated_at: client.updatedAt,
  }
}

@Injectable()
export class ClientsService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  async findOne(id: string) {
    const client = await this.db.query.clients.findFirst({
      where: eq(clients.id, id),
    })
    if (!client) throw new NotFoundException(`Client ${id} not found`)

    const leads = await this.db.query.metaLeads.findMany({
      where: eq(metaLeads.clientId, id),
      with: { assignedToProfile: true, crmDetails: true },
      orderBy: (t, { desc }) => [desc(t.receivedAt)],
    })

    return {
      client: serializeClient(client),
      leads: leads.map(serializeMetaLead),
    }
  }

  async updateStatus(id: string, updatedBy: string, status: string, statusNote?: string) {
    const client = await this.db.query.clients.findFirst({ where: eq(clients.id, id) })
    if (!client) throw new NotFoundException(`Client ${id} not found`)

    const [updated] = await this.db
      .update(clients)
      .set({ status, statusNote: statusNote ?? null, statusUpdatedBy: updatedBy, statusUpdatedAt: new Date(), updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning()
    return { client: serializeClient(updated) }
  }
}
