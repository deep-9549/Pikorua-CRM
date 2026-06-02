import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, desc, and, isNull } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { metaLeads, leadCrmDetails, leadNotes } from '@pikorua/db'
import { CreateLeadDto } from './dto/create-lead.dto'
import { UpdateLeadDto } from './dto/update-lead.dto'
import { CreateLeadNoteDto } from './dto/create-lead-note.dto'

@Injectable()
export class LeadsService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  async findAll(status?: string) {
    const conditions = [isNull(metaLeads.deletedAt)]
    if (status) conditions.push(eq(metaLeads.status, status as never))

    return this.db.query.metaLeads.findMany({
      where: and(...conditions),
      with: {
        assignedToProfile: true,
        assignedByProfile: true,
        crmDetails: true,
      },
      orderBy: [desc(metaLeads.receivedAt)],
    })
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
    if (!lead) throw new NotFoundException(`Lead ${id} not found`)
    return lead
  }

  async create(dto: CreateLeadDto) {
    const [lead] = await this.db.insert(metaLeads).values({
      fullName: dto.full_name,
      phone: dto.phone,
      email: dto.email ?? null,
      city: dto.city ?? null,
      campaignName: dto.campaign_name ?? null,
      formData: dto.notes ? { notes: dto.notes } : null,
      source: 'manual',
      status: 'unassigned',
    }).returning()
    return lead
  }

  async update(id: string, dto: UpdateLeadDto) {
    await this.findOne(id)
    const existing = await this.db.query.leadCrmDetails.findFirst({
      where: eq(leadCrmDetails.leadId, id),
    })

    const payload = {
      ...(dto.call_status !== undefined && { callStatus: dto.call_status as never }),
      ...(dto.hwc !== undefined && { hwc: dto.hwc as never }),
      ...(dto.follow_up_date !== undefined && { followUpDate: new Date(dto.follow_up_date) }),
      ...(dto.buying_status !== undefined && { buyingStatus: dto.buying_status as never }),
      ...(dto.site_visit_status !== undefined && { siteVisitStatus: dto.site_visit_status as never }),
      ...(dto.budget_range !== undefined && { budgetRange: dto.budget_range }),
      ...(dto.profession !== undefined && { profession: dto.profession }),
      ...(dto.current_city !== undefined && { currentCity: dto.current_city }),
      ...(dto.current_area !== undefined && { currentArea: dto.current_area }),
    }

    if (existing) {
      await this.db.update(leadCrmDetails).set(payload).where(eq(leadCrmDetails.leadId, id))
    } else {
      await this.db.insert(leadCrmDetails).values({ leadId: id, ...payload })
    }
    return this.findOne(id)
  }

  async getNotes(leadId: string) {
    await this.findOne(leadId)
    return this.db.query.leadNotes.findMany({
      where: eq(leadNotes.leadId, leadId),
      orderBy: [desc(leadNotes.createdAt)],
    })
  }

  async addNote(leadId: string, employeeId: string, dto: CreateLeadNoteDto) {
    await this.findOne(leadId)
    const [note] = await this.db.insert(leadNotes).values({
      leadId,
      employeeId,
      content: dto.content,
      type: dto.type ?? 'general',
    }).returning()
    return note
  }
}
