import { Injectable } from '@nestjs/common'
import { desc, eq } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { leadActivityEvents, userProfiles } from '@pikorua/db'

type ActivityEventType = typeof leadActivityEvents.$inferInsert.eventType
type ChangeValue = { label: string; from: unknown; to: unknown }
export type LeadActivityChanges = Record<string, ChangeValue>

type ProfileSnapshot = {
  id: string | null
  name: string | null
}

type RecordActivityInput = {
  leadId: string
  actorUserId?: string | null
  actorName?: string | null
  eventType: ActivityEventType
  source?: string
  title: string
  description?: string | null
  fromUserId?: string | null
  fromUserName?: string | null
  toUserId?: string | null
  toUserName?: string | null
  changes?: LeadActivityChanges | null
  metadata?: Record<string, unknown> | null
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalizeValue)
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, inner]) => [key, normalizeValue(inner)])
    return Object.fromEntries(entries)
  }
  return value ?? null
}

function valuesEqual(a: unknown, b: unknown) {
  return JSON.stringify(normalizeValue(a)) === JSON.stringify(normalizeValue(b))
}

function serializeActivityEvent(event: typeof leadActivityEvents.$inferSelect) {
  return {
    id: event.id,
    lead_id: event.leadId,
    actor_user_id: event.actorUserId,
    actor_name: event.actorName,
    event_type: event.eventType,
    source: event.source,
    title: event.title,
    description: event.description,
    from_user_id: event.fromUserId,
    from_user_name: event.fromUserName,
    to_user_id: event.toUserId,
    to_user_name: event.toUserName,
    changes: event.changes ?? null,
    metadata: event.metadata ?? null,
    created_at: event.createdAt,
  }
}

@Injectable()
export class LeadActivityService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  async getLeadActivity(leadId: string) {
    const events = await this.db.query.leadActivityEvents.findMany({
      where: eq(leadActivityEvents.leadId, leadId),
      orderBy: [desc(leadActivityEvents.createdAt)],
    })

    return events.map(serializeActivityEvent)
  }

  diff(
    before: Record<string, unknown> | null | undefined,
    after: Record<string, unknown> | null | undefined,
    labels: Record<string, string>,
  ): LeadActivityChanges {
    const changes: LeadActivityChanges = {}

    for (const [key, label] of Object.entries(labels)) {
      const from = before?.[key] ?? null
      const to = after?.[key] ?? null
      if (!valuesEqual(from, to)) {
        changes[key] = { label, from: normalizeValue(from), to: normalizeValue(to) }
      }
    }

    return changes
  }

  async record(input: RecordActivityInput, db: any = this.db) {
    const actor = await this.profileSnapshot(input.actorUserId ?? null, input.actorName ?? null, db)
    const fromUser = await this.profileSnapshot(input.fromUserId ?? null, input.fromUserName ?? null, db)
    const toUser = await this.profileSnapshot(input.toUserId ?? null, input.toUserName ?? null, db)

    const [event] = await db.insert(leadActivityEvents).values({
      leadId: input.leadId,
      actorUserId: actor.id,
      actorName: actor.name,
      eventType: input.eventType,
      source: input.source ?? 'manual',
      title: input.title,
      description: input.description ?? null,
      fromUserId: fromUser.id,
      fromUserName: fromUser.name,
      toUserId: toUser.id,
      toUserName: toUser.name,
      changes: input.changes ?? null,
      metadata: input.metadata ?? null,
    }).returning()

    return serializeActivityEvent(event)
  }

  private async profileSnapshot(userId: string | null, fallbackName: string | null, db: any): Promise<ProfileSnapshot> {
    if (!userId) return { id: null, name: fallbackName ?? null }

    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, userId),
      columns: { id: true, fullName: true, email: true },
    })

    return {
      id: userId,
      name: profile?.fullName ?? fallbackName ?? profile?.email ?? null,
    }
  }
}
