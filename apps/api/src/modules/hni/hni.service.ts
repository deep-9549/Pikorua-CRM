import { Injectable, NotFoundException } from '@nestjs/common'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { hniActivities, hniProfiles } from '@pikorua/db'
import { DatabaseService } from '../../database/database.service'
import { CreateHniActivityDto, UpsertHniProfileDto } from './dto/hni.dto'

const money = (value?: number) => value === undefined ? undefined : String(value)

function profileValues(dto: UpsertHniProfileDto) {
  return {
    fullName: dto.full_name,
    category: dto.category,
    designation: dto.designation || null,
    organisation: dto.organisation || null,
    city: dto.city || null,
    country: dto.country || null,
    phone: dto.phone || null,
    email: dto.email || null,
    assistantName: dto.assistant_name || null,
    assistantPhone: dto.assistant_phone || null,
    tier: dto.tier,
    relationshipStage: dto.relationship_stage,
    relationshipOwnerId: dto.relationship_owner_id || null,
    estimatedPortfolioValue: money(dto.estimated_portfolio_value),
    estimatedBudgetMin: money(dto.estimated_budget_min),
    estimatedBudgetMax: money(dto.estimated_budget_max),
    propertiesOwned: dto.properties_owned,
    preferences: dto.preferences,
    interests: dto.interests,
    communicationPreferences: dto.communication_preferences || null,
    relationshipNotes: dto.relationship_notes || null,
    source: dto.source || null,
    lastContactAt: dto.last_contact_at ? new Date(dto.last_contact_at) : null,
    nextActionAt: dto.next_action_at ? new Date(dto.next_action_at) : null,
    nextAction: dto.next_action || null,
    isSensitive: dto.is_sensitive,
    updatedAt: new Date(),
  }
}

@Injectable()
export class HniService {
  constructor(private readonly database: DatabaseService) {}
  private get db() { return this.database.db }

  async findAll() {
    const rows = await this.db.query.hniProfiles.findMany({
      where: isNull(hniProfiles.deletedAt),
      with: { owner: true, activities: { orderBy: [desc(hniActivities.occurredAt)], limit: 5 } },
      orderBy: [desc(hniProfiles.updatedAt)],
    })
    return { profiles: rows }
  }

  async findOne(id: string) {
    const profile = await this.db.query.hniProfiles.findFirst({
      where: and(eq(hniProfiles.id, id), isNull(hniProfiles.deletedAt)),
      with: { owner: true, activities: { with: { actor: true }, orderBy: [desc(hniActivities.occurredAt)] } },
    })
    if (!profile) throw new NotFoundException('HNI profile not found')
    return { profile }
  }

  async create(dto: UpsertHniProfileDto, userId: string) {
    const [profile] = await this.db.insert(hniProfiles).values({
      ...profileValues(dto), fullName: dto.full_name, createdBy: userId,
    }).returning()
    await this.db.insert(hniActivities).values({
      hniProfileId: profile.id, activityType: 'note', title: 'VIP profile created', createdBy: userId,
    })
    return { profile }
  }

  async update(id: string, dto: UpsertHniProfileDto) {
    const [profile] = await this.db.update(hniProfiles).set(profileValues(dto))
      .where(and(eq(hniProfiles.id, id), isNull(hniProfiles.deletedAt))).returning()
    if (!profile) throw new NotFoundException('HNI profile not found')
    return { profile }
  }

  async addActivity(id: string, dto: CreateHniActivityDto, userId: string) {
    const profile = await this.db.query.hniProfiles.findFirst({ where: and(eq(hniProfiles.id, id), isNull(hniProfiles.deletedAt)) })
    if (!profile) throw new NotFoundException('HNI profile not found')
    const occurredAt = dto.occurred_at ? new Date(dto.occurred_at) : new Date()
    const [activity] = await this.db.insert(hniActivities).values({
      hniProfileId: id, activityType: dto.activity_type, title: dto.title, notes: dto.notes, occurredAt, createdBy: userId,
    }).returning()
    await this.db.update(hniProfiles).set({ lastContactAt: occurredAt, updatedAt: new Date() }).where(eq(hniProfiles.id, id))
    return { activity }
  }
}
