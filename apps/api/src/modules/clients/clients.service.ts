import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, isNull } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { clients, metaLeads } from '@pikorua/db'

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

    return { ...client, leads }
  }

  async updateStatus(id: string, updatedBy: string, status: string, statusNote?: string) {
    const client = await this.db.query.clients.findFirst({ where: eq(clients.id, id) })
    if (!client) throw new NotFoundException(`Client ${id} not found`)

    const [updated] = await this.db
      .update(clients)
      .set({ status, statusNote: statusNote ?? null, statusUpdatedBy: updatedBy, statusUpdatedAt: new Date(), updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning()
    return updated
  }
}
