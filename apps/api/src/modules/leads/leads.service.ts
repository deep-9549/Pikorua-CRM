import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, desc, and, isNull, inArray } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import {
  metaLeads, leadCrmDetails, leadNotes, leadInteractions, siteVisits,
  bookings, conversations, messages,
} from '@pikorua/db'
import { CreateLeadDto } from './dto/create-lead.dto'
import { UpdateLeadDto } from './dto/update-lead.dto'
import { CreateLeadNoteDto } from './dto/create-lead-note.dto'
import { serializeCrmDetails, serializeMetaLead } from './lead.serializer'

@Injectable()
export class LeadsService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  async findAll(status: string | undefined, user: { id: string; role: string }) {
    const conditions = [isNull(metaLeads.deletedAt)]
    if (status) conditions.push(eq(metaLeads.status, status as never))
    // Sales executives may only ever see leads assigned to them.
    if (user.role !== 'super_admin') conditions.push(eq(metaLeads.assignedTo, user.id))

    const leads = await this.db.query.metaLeads.findMany({
      where: and(...conditions),
      with: {
        assignedToProfile: true,
        assignedByProfile: true,
        crmDetails: true,
      },
      orderBy: [desc(metaLeads.receivedAt)],
    })

    return { leads: leads.map(serializeMetaLead) }
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
    return serializeMetaLead(lead)
  }

  async findCrm(id: string) {
    const lead = await this.findOne(id)
    return { crm: serializeCrmDetails((lead as any)?.crm) }
  }

  async create(dto: CreateLeadDto, user: { id: string; role: string }) {
    const shouldAssignToCreator = user.role !== 'super_admin'
    const assignedAt = shouldAssignToCreator ? new Date() : null

    const [lead] = await this.db.insert(metaLeads).values({
      fullName: dto.full_name,
      phone: dto.phone,
      email: dto.email ?? null,
      city: dto.city ?? null,
      campaignName: dto.campaign_name ?? null,
      formData: dto.notes ? { notes: dto.notes } : null,
      source: 'manual',
      status: shouldAssignToCreator ? 'assigned' : 'unassigned',
      assignedTo: shouldAssignToCreator ? user.id : null,
      assignedBy: shouldAssignToCreator ? user.id : null,
      assignedAt,
    }).returning()

    const createdLead = await this.db.query.metaLeads.findFirst({
      where: eq(metaLeads.id, lead.id),
      with: {
        assignedToProfile: true,
        assignedByProfile: true,
        crmDetails: true,
      },
    })

    return { lead: serializeMetaLead(createdLead ?? lead) }
  }

  async update(id: string, dto: UpdateLeadDto, userId?: string) {
    // Fetch the lead once (404s if missing) and reuse it for the response so we
    // don't re-query the whole lead graph after writing.
    const lead = await this.findOne(id)
    const existing = await this.db.query.leadCrmDetails.findFirst({
      where: eq(leadCrmDetails.leadId, id),
    })

    // Map UI site_visit_status values to DB enum values
    const SITE_VISIT_UI_TO_DB: Record<string, string> = {
      yet_to_visit: 'not_scheduled',
      visit_week_confirmed: 'scheduled',
      visit_date_confirmed: 'scheduled',
      visited: 'completed',
      // pass through existing DB values
      scheduled: 'scheduled',
      completed: 'completed',
      not_scheduled: 'not_scheduled',
    }

    // Map UI buying_status values to DB enum values
    const BUYING_UI_TO_DB: Record<string, string> = {
      still_searching: 'exploring',
      postponed: 'not_ready',
      bought: 'not_ready',
      not_interested: 'not_ready',
      interested: 'interested',
      // pass through existing DB values
      ready: 'ready',
      exploring: 'exploring',
      not_ready: 'not_ready',
    }

    const dbSiteVisit = dto.site_visit_status !== undefined
      ? (SITE_VISIT_UI_TO_DB[dto.site_visit_status] ?? null)
      : undefined
    const dbBuying = dto.buying_status !== undefined
      ? (BUYING_UI_TO_DB[dto.buying_status] ?? null)
      : undefined

    const toDate = (v: string | null | undefined) => (v ? new Date(v) : null)

    const payload = {
      ...(dto.call_status !== undefined && { callStatus: dto.call_status as never }),
      ...(dto.not_spoken_reason !== undefined && { notSpokenReason: dto.not_spoken_reason as never }),
      ...(dto.first_call_date !== undefined && { firstCallDate: toDate(dto.first_call_date) }),
      ...(dto.last_call_date !== undefined && { lastCallDate: toDate(dto.last_call_date) }),
      ...(dto.hwc !== undefined && { hwc: null }),
      ...(dto.follow_up_date !== undefined && { followUpDate: toDate(dto.follow_up_date) }),
      ...(dto.follow_up_done !== undefined && { followUpDone: dto.follow_up_done }),
      ...(dto.follow_up_remarks !== undefined && { followUpRemarks: dto.follow_up_remarks }),
      ...(dbBuying !== undefined && { buyingStatus: dbBuying as never }),
      ...(dbSiteVisit !== undefined && { siteVisitStatus: dbSiteVisit as never }),
      ...(dto.visit_date !== undefined && { visitDate: toDate(dto.visit_date) }),
      ...(dto.visit_confirmation_date !== undefined && { visitConfirmationDate: toDate(dto.visit_confirmation_date) }),
      ...(dto.project_name !== undefined && { projectName: dto.project_name }),
      ...(dto.budget_range !== undefined && { budgetRange: dto.budget_range }),
      ...(dto.configuration !== undefined && { configuration: dto.configuration }),
      ...(dto.profession !== undefined && { profession: dto.profession }),
      ...(dto.company_name !== undefined && { companyName: dto.company_name }),
      ...(dto.current_city !== undefined && { currentCity: dto.current_city }),
      ...(dto.current_area !== undefined && { currentArea: dto.current_area }),
      ...(dto.remarks !== undefined && { remarks: dto.remarks }),
    }

    if (existing) {
      await this.db.update(leadCrmDetails).set(payload).where(eq(leadCrmDetails.leadId, id))
    } else {
      await this.db.insert(leadCrmDetails).values({ leadId: id, ...payload })
    }

    // Sync to siteVisits table only when a site-visit field was actually part of
    // this update — a plain CRM save shouldn't touch the site_visits table.
    if (dto.site_visit_status !== undefined) {
      await this.syncSiteVisit(id, dto, userId)
    }

    // Return the updated lead built from data already in hand — no extra query.
    const mergedCrm = serializeCrmDetails({ ...(existing ?? {}), ...payload })
    return { ...lead, crm: mergedCrm }
  }

  private async syncSiteVisit(leadId: string, dto: UpdateLeadDto, userId?: string) {
    const uiStatus = dto.site_visit_status
    if (!uiStatus || uiStatus === 'yet_to_visit') return

    const dbStatus = uiStatus === 'visited' ? 'completed' : 'scheduled'

    // Determine the scheduled date from the DTO fields
    const scheduledDate = dto.visit_date
      ? new Date(dto.visit_date)
      : dto.visit_confirmation_date
        ? new Date(dto.visit_confirmation_date)
        : null

    // Find the most recent non-deleted site visit for this lead
    const existing = await this.db.query.siteVisits.findFirst({
      where: and(eq(siteVisits.leadId, leadId), isNull(siteVisits.deletedAt)),
      orderBy: [desc(siteVisits.createdAt)],
    })

    if (existing) {
      await this.db.update(siteVisits).set({
        status: dbStatus as never,
        ...(scheduledDate ? { scheduledDate } : {}),
        updatedAt: new Date(),
      }).where(eq(siteVisits.id, existing.id))
    } else if (userId) {
      await this.db.insert(siteVisits).values({
        tenantId: '00000000-0000-0000-0000-000000000000',
        leadId,
        employeeId: userId,
        scheduledDate: scheduledDate ?? new Date(),
        status: dbStatus as never,
      })
    }
  }

  /**
   * Permanently delete a lead and everything attached to it. Every child table
   * has a NOT NULL foreign key to meta_leads with no cascade, so they must be
   * removed first — including chat messages, which hang off conversations.
   * Wrapped in a transaction so a lead is never left half-deleted.
   */
  async remove(id: string) {
    await this.findOne(id) // 404s if the lead doesn't exist

    await this.db.transaction(async (tx) => {
      // messages → conversations (messages reference conversations, not the lead)
      await tx.delete(messages).where(
        inArray(
          messages.conversationId,
          tx.select({ id: conversations.id }).from(conversations).where(eq(conversations.leadId, id)),
        ),
      )
      await tx.delete(conversations).where(eq(conversations.leadId, id))
      await tx.delete(bookings).where(eq(bookings.leadId, id))
      await tx.delete(siteVisits).where(eq(siteVisits.leadId, id))
      await tx.delete(leadInteractions).where(eq(leadInteractions.leadId, id))
      await tx.delete(leadNotes).where(eq(leadNotes.leadId, id))
      await tx.delete(leadCrmDetails).where(eq(leadCrmDetails.leadId, id))
      await tx.delete(metaLeads).where(eq(metaLeads.id, id))
    })

    return { deleted: true }
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
