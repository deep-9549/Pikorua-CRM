import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { eq, desc, asc, and, isNull, inArray, notInArray } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import {
  metaLeads, leadCrmDetails, leadNotes, leadInteractions, siteVisits, clients,
  bookings, conversations, messages, leadFollowUps,
} from '@pikorua/db'
import { CreateLeadDto } from './dto/create-lead.dto'
import { UpdateLeadDto } from './dto/update-lead.dto'
import { CreateLeadNoteDto } from './dto/create-lead-note.dto'
import { CreateFollowUpDto } from './dto/create-follow-up.dto'
import { CompleteFollowUpDto } from './dto/complete-follow-up.dto'
import { serializeCrmDetails, serializeMetaLead } from './lead.serializer'
import { LeadActivityService } from '../lead-activity/lead-activity.service'
import { META_LEAD_POOL_STATUSES, isMetaLeadPoolStatus, poolStatusForClientStatus } from './lead-pools'

@Injectable()
export class LeadsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly leadActivityService: LeadActivityService,
  ) {}

  private get db() { return this.database.db }

  private readonly crmActivityLabels: Record<string, string> = {
    call_status: 'Call Status',
    not_spoken_reason: 'Not Spoken Reason',
    first_call_date: 'First Call Date',
    last_call_date: 'Last Call Date',
    follow_up_date: 'Follow-up Date',
    follow_up_done: 'Follow-up Done',
    follow_up_remarks: 'Follow-up Remarks',
    buying_status: 'Buying Status',
    site_visit_status: 'Site Visit Status',
    visit_date: 'Visit Date',
    visit_confirmation_date: 'Visit Confirmation Date',
    project_name: 'Project Name',
    budget_range: 'Budget',
    configuration: 'Configuration',
    profession: 'Profession',
    company_name: 'Company',
    current_city: 'Current City',
    current_area: 'Current Area',
    preferred_locations: 'Preferred Locations',
    remarks: 'Remarks',
  }

  private serializeFollowUp(followUp: any) {
    return {
      id: followUp.id,
      lead_id: followUp.leadId,
      scheduled_at: followUp.scheduledAt,
      status: followUp.status,
      call_status: followUp.callStatus ?? null,
      notes: followUp.notes ?? null,
      outcome_remarks: followUp.outcomeRemarks ?? null,
      completed_at: followUp.completedAt ?? null,
      created_by_name: followUp.creator?.fullName ?? null,
      completed_by_name: followUp.completedByProfile?.fullName ?? null,
      created_at: followUp.createdAt,
      updated_at: followUp.updatedAt,
    }
  }

  private assertCanUpdateLead(lead: any, user: { id: string; role: string }) {
    const allowed = user.role === 'super_admin'
      || lead.assigned_to === user.id
      || isMetaLeadPoolStatus(lead.status)
    if (!allowed) throw new ForbiddenException('You can only update leads assigned to you')
  }

  async findAll(status: string | undefined, user: { id: string; role: string }, includePools = false) {
    const conditions = [isNull(metaLeads.deletedAt)]
    if (status) conditions.push(eq(metaLeads.status, status as never))
    else if (!includePools) conditions.push(notInArray(metaLeads.status, META_LEAD_POOL_STATUSES as never))
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
    const existingClient = await this.db.query.clients.findFirst({
      where: eq(clients.phone, dto.phone),
    })
    const pooledStatus = poolStatusForClientStatus(existingClient?.status)
    const initialStatus = pooledStatus ?? (shouldAssignToCreator ? 'assigned' : 'unassigned')

    const [lead] = await this.db.insert(metaLeads).values({
      fullName: dto.full_name,
      phone: dto.phone,
      email: dto.email ?? null,
      city: dto.city ?? null,
      campaignName: dto.campaign_name ?? null,
      formData: dto.notes ? { notes: dto.notes } : null,
      source: 'manual',
      clientId: existingClient?.id ?? null,
      status: initialStatus as never,
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

    await this.leadActivityService.record({
      leadId: lead.id,
      actorUserId: user.id,
      eventType: 'lead_created',
      source: 'manual',
      title: shouldAssignToCreator ? 'Lead created and assigned' : 'Lead created',
      description: shouldAssignToCreator
        ? 'Manual lead was created and assigned to the creator.'
        : 'Manual lead was created and left unassigned.',
      toUserId: shouldAssignToCreator ? user.id : null,
      changes: {
        status: { label: 'Status', from: null, to: initialStatus },
        assigned_to: {
          label: 'Assigned To',
          from: null,
          to: shouldAssignToCreator ? (createdLead?.assignedToProfile?.fullName ?? user.id) : null,
        },
      },
      metadata: { source: 'manual' },
    })

    return { lead: serializeMetaLead(createdLead ?? lead) }
  }

  async update(id: string, dto: UpdateLeadDto, user?: { id: string; role: string }) {
    // Fetch the lead once (404s if missing) and reuse it for the response so we
    // don't re-query the whole lead graph after writing.
    const lead = await this.findOne(id)
    const canUpdate = user?.role === 'super_admin'
      || (user?.id && (lead as any).assigned_to === user.id)
      || isMetaLeadPoolStatus((lead as any).status)
    if (!canUpdate) throw new ForbiddenException('You can only update leads assigned to you')

    const existing = await this.db.query.leadCrmDetails.findFirst({
      where: eq(leadCrmDetails.leadId, id),
    })
    const beforeCrm = serializeCrmDetails(existing)

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
    const now = new Date()
    const userId = user?.id
    const isAssignedOwnerSave = Boolean(userId && (lead as any).assigned_to === userId)
    const savedCallStatus = dto.call_status !== undefined
      ? dto.call_status
      : existing?.callStatus ?? null
    const shouldLogSaveAsCall = isAssignedOwnerSave
    const savedAtIst = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().replace('Z', '+05:30')

    const payload = {
      ...(dto.call_status !== undefined && { callStatus: dto.call_status as never }),
      ...(dto.not_spoken_reason !== undefined && { notSpokenReason: dto.not_spoken_reason as never }),
      ...(dto.first_call_date !== undefined && { firstCallDate: toDate(dto.first_call_date) }),
      ...(dto.last_call_date !== undefined && { lastCallDate: toDate(dto.last_call_date) }),
      ...(shouldLogSaveAsCall && !existing?.firstCallDate && { firstCallDate: now }),
      ...(shouldLogSaveAsCall && { lastCallDate: now }),
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
      ...(dto.preferred_locations !== undefined && { preferredLocations: dto.preferred_locations }),
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
    const changes = this.leadActivityService.diff(
      beforeCrm as Record<string, unknown> | null,
      mergedCrm as Record<string, unknown> | null,
      this.crmActivityLabels,
    )

    const callLoggedMetadata = shouldLogSaveAsCall
      ? {
          call_logged: true,
          call_status: savedCallStatus,
          saved_at: now.toISOString(),
          saved_at_ist: savedAtIst,
          saved_timezone: 'Asia/Kolkata',
          saved_utc_offset: '+05:30',
        }
      : null

    if (Object.keys(changes).length > 0 || callLoggedMetadata) {
      await this.leadActivityService.record({
        leadId: id,
        actorUserId: userId ?? null,
        eventType: 'crm_updated',
        source: 'crm_form',
        title: 'CRM details updated',
        description: Object.keys(changes).length > 0
          ? `${Object.keys(changes).length} CRM field(s) changed.`
          : 'Lead saved from CRM form.',
        changes: Object.keys(changes).length > 0 ? changes : null,
        metadata: callLoggedMetadata,
      })
    }

    return { ...lead, crm: mergedCrm }
  }

  async getFollowUps(leadId: string, user: { id: string; role: string }) {
    const lead = await this.findOne(leadId)
    this.assertCanUpdateLead(lead, user)
    const followUps = await this.db.query.leadFollowUps.findMany({
      where: eq(leadFollowUps.leadId, leadId),
      with: { creator: true, completedByProfile: true },
      orderBy: [desc(leadFollowUps.scheduledAt)],
    })
    return { follow_ups: followUps.map((item) => this.serializeFollowUp(item)) }
  }

  async createFollowUp(leadId: string, dto: CreateFollowUpDto, user: { id: string; role: string }) {
    const lead = await this.findOne(leadId)
    this.assertCanUpdateLead(lead, user)
    const scheduledAt = new Date(dto.scheduled_at)

    const followUp = await this.db.transaction(async (tx) => {
      const [created] = await tx.insert(leadFollowUps).values({
        leadId,
        scheduledAt,
        notes: dto.notes?.trim() || null,
        createdBy: user.id,
      }).returning()
      await this.syncNextFollowUp(tx, leadId)
      return created
    })

    await this.leadActivityService.record({
      leadId,
      actorUserId: user.id,
      eventType: 'crm_updated',
      source: 'follow_up',
      title: 'Follow-up scheduled',
      description: dto.notes?.trim() || 'A new client follow-up was scheduled.',
      metadata: { follow_up_id: followUp.id, scheduled_at: scheduledAt.toISOString() },
    })
    return this.getFollowUps(leadId, user)
  }

  async completeFollowUp(
    leadId: string,
    followUpId: string,
    dto: CompleteFollowUpDto,
    user: { id: string; role: string },
  ) {
    const lead = await this.findOne(leadId)
    this.assertCanUpdateLead(lead, user)
    const now = new Date()

    const completed = await this.db.transaction(async (tx) => {
      const [updated] = await tx.update(leadFollowUps).set({
        status: 'completed',
        callStatus: dto.call_status,
        outcomeRemarks: dto.remarks?.trim() || null,
        completedAt: now,
        completedBy: user.id,
        updatedAt: now,
      }).where(and(
        eq(leadFollowUps.id, followUpId),
        eq(leadFollowUps.leadId, leadId),
        eq(leadFollowUps.status, 'scheduled'),
      )).returning()
      if (!updated) throw new NotFoundException('Scheduled follow-up not found')
      await this.syncNextFollowUp(tx, leadId, dto.remarks?.trim() || null)
      return updated
    })

    await this.leadActivityService.record({
      leadId,
      actorUserId: user.id,
      eventType: 'crm_updated',
      source: 'follow_up',
      title: 'Follow-up completed',
      description: dto.remarks?.trim() || 'Client follow-up marked as completed.',
      metadata: {
        follow_up_id: completed.id,
        completed_at: now.toISOString(),
        call_status: dto.call_status,
        call_logged: true,
      },
    })
    return this.getFollowUps(leadId, user)
  }

  private async syncNextFollowUp(tx: any, leadId: string, lastRemarks: string | null = null) {
    const next = await tx.query.leadFollowUps.findFirst({
      where: and(eq(leadFollowUps.leadId, leadId), eq(leadFollowUps.status, 'scheduled')),
      orderBy: [asc(leadFollowUps.scheduledAt)],
    })
    const existing = await tx.query.leadCrmDetails.findFirst({
      where: eq(leadCrmDetails.leadId, leadId),
    })
    const payload = {
      followUpDate: next?.scheduledAt ?? null,
      followUpDone: !next,
      ...(lastRemarks !== null ? { followUpRemarks: lastRemarks } : {}),
      updatedAt: new Date(),
    }
    if (existing) await tx.update(leadCrmDetails).set(payload).where(eq(leadCrmDetails.leadId, leadId))
    else await tx.insert(leadCrmDetails).values({ leadId, ...payload })
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
      await tx.delete(leadFollowUps).where(eq(leadFollowUps.leadId, id))
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
    await this.leadActivityService.record({
      leadId,
      actorUserId: employeeId,
      eventType: 'crm_updated',
      source: 'note',
      title: 'Note added',
      description: dto.content,
      metadata: { note_id: note.id, note_type: note.type },
    })
    return note
  }
}
