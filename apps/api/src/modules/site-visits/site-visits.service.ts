import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, desc, isNull, and } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { siteVisits, leadCrmDetails } from '@pikorua/db'
import { CreateSiteVisitDto } from './dto/create-site-visit.dto'
import { UpdateSiteVisitDto } from './dto/update-site-visit.dto'
import { serializeMetaLead } from '../leads/lead.serializer'
import { serializeProfile } from '../../common/serializers/profile.serializer'
import { LeadActivityService } from '../lead-activity/lead-activity.service'

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000'

function toUiVisitStatus(visit: any) {
  if (visit.status === 'completed') return 'visited'
  if (visit.status === 'cancelled' || visit.status === 'no_show') return 'yet_to_visit'
  return 'visit_date_confirmed'
}

function serializeVisit(visit: any) {
  const uiStatus = toUiVisitStatus(visit)
  const lead = serializeMetaLead(visit.lead) as any

  return {
    id: visit.id,
    meta_lead_id: visit.leadId,
    site_visit_status: uiStatus,
    visit_date: visit.scheduledDate,
    visit_confirmation_date: uiStatus !== 'visited' ? visit.scheduledDate : null,
    scheduled_by_profile: serializeProfile(visit.employee),
    lead,
    status: visit.status,
    notes: visit.notes,
    feedback: visit.feedback,
    rating: visit.rating,
    outcome: visit.outcome,
    cancellation_reason: visit.cancellationReason,
    follow_up_date: visit.followUpDate,
    created_at: visit.createdAt,
    updated_at: visit.updatedAt,
  }
}

@Injectable()
export class SiteVisitsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly leadActivityService: LeadActivityService,
  ) {}

  private get db() { return this.database.db }

  private readonly visitActivityLabels: Record<string, string> = {
    status: 'Visit Status',
    outcome: 'Visit Outcome',
    scheduled_date: 'Visit Date',
    cancellation_reason: 'Cancellation Reason',
    follow_up_date: 'Follow-up Date',
    feedback: 'Feedback',
    rating: 'Rating',
  }

  async findAll(status: string | undefined, user: { id: string; role: string }) {
    const conditions = [isNull(siteVisits.deletedAt)]
    if (user.role !== 'super_admin') conditions.push(eq(siteVisits.employeeId, user.id))
    if (status && !['upcoming', 'past'].includes(status)) {
      conditions.push(eq(siteVisits.status, status as never))
    }

    const visits = await this.db.query.siteVisits.findMany({
      where: and(...conditions),
      with: {
        lead: {
          with: {
            assignedToProfile: true,
            crmDetails: true,
          },
        },
        property: true,
        employee: true,
      },
      orderBy: [desc(siteVisits.scheduledDate)],
    })

    const now = Date.now()
    const filtered = visits.filter((visit) => {
      if (status === 'upcoming') {
        return visit.status === 'scheduled' && visit.scheduledDate.getTime() >= now
      }

      if (status === 'past') {
        return visit.status !== 'scheduled' || visit.scheduledDate.getTime() < now
      }

      return true
    })

    return { visits: filtered.map(serializeVisit) }
  }

  async create(dto: CreateSiteVisitDto, user: { id: string; role: string }) {
    const scheduledDate =
      dto.scheduled_date ??
      dto.visit_date ??
      dto.visit_confirmation_date ??
      new Date().toISOString()
    const visitStatus = dto.site_visit_status === 'visited' ? 'completed' : 'scheduled'
    const employeeId = user.role === 'super_admin' && dto.employee_id
      ? dto.employee_id
      : user.id

    const [visit] = await this.db.insert(siteVisits).values({
      tenantId: DEFAULT_TENANT_ID,
      leadId: dto.lead_id,
      employeeId,
      propertyId: dto.property_id ?? null,
      scheduledDate: new Date(scheduledDate),
      notes: dto.notes ?? null,
      status: visitStatus,
    }).returning()
    await this.leadActivityService.record({
      leadId: dto.lead_id,
      actorUserId: user.id,
      eventType: 'site_visit_updated',
      source: 'site_visit',
      title: visitStatus === 'completed' ? 'Site visit completed' : 'Site visit scheduled',
      description: dto.notes ?? null,
      changes: {
        site_visit_status: { label: 'Site Visit Status', from: null, to: visitStatus },
        scheduled_date: { label: 'Visit Date', from: null, to: visit.scheduledDate },
      },
      metadata: { site_visit_id: visit.id },
    })
    return { visit: serializeVisit(visit) }
  }

  async update(id: string, dto: UpdateSiteVisitDto, user: { id: string; role: string }) {
    const visit = await this.db.query.siteVisits.findFirst({
      where: and(eq(siteVisits.id, id), isNull(siteVisits.deletedAt)),
    })
    if (!visit) throw new NotFoundException(`Site visit ${id} not found`)
    if (user.role !== 'super_admin' && visit.employeeId !== user.id) {
      throw new NotFoundException(`Site visit ${id} not found`)
    }

    const outcomeStatus = dto.outcome === 'visit_done'
      ? 'completed'
      : dto.outcome === 'visit_cancelled'
        ? 'cancelled'
        : dto.outcome === 'visit_rescheduled'
          ? 'scheduled'
          : undefined

    const updated = await this.db.transaction(async (tx) => {
      const [savedVisit] = await tx.update(siteVisits).set({
        ...(dto.status !== undefined && { status: dto.status as never }),
        ...(outcomeStatus !== undefined && { status: outcomeStatus as never }),
        ...(dto.outcome !== undefined && { outcome: dto.outcome as never }),
        ...(dto.rescheduled_date !== undefined && { scheduledDate: new Date(dto.rescheduled_date) }),
        ...(dto.outcome === 'visit_done' && { cancellationReason: null }),
        ...(dto.outcome === 'visit_rescheduled' && { cancellationReason: null, feedback: null }),
        ...(dto.outcome === 'visit_cancelled' && { feedback: null }),
        ...(dto.cancellation_reason !== undefined && { cancellationReason: dto.cancellation_reason }),
        ...(dto.follow_up_date !== undefined && { followUpDate: new Date(dto.follow_up_date) }),
        ...(dto.feedback !== undefined && { feedback: dto.feedback }),
        ...(dto.rating !== undefined && { rating: dto.rating }),
        updatedAt: new Date(),
      }).where(eq(siteVisits.id, id)).returning()

      if (dto.follow_up_date !== undefined || dto.outcome !== undefined) {
        const existingCrm = await tx.query.leadCrmDetails.findFirst({ where: eq(leadCrmDetails.leadId, visit.leadId) })
        const crmUpdate = {
          ...(dto.follow_up_date !== undefined && { followUpDate: new Date(dto.follow_up_date), followUpDone: false }),
          ...(dto.outcome === 'visit_done' && {
            siteVisitStatus: 'completed' as const,
            visitDate: savedVisit.scheduledDate,
            visitConfirmationDate: null,
          }),
          ...(dto.outcome === 'visit_rescheduled' && {
            siteVisitStatus: 'scheduled' as const,
            visitDate: null,
            visitConfirmationDate: savedVisit.scheduledDate,
          }),
          ...(dto.outcome === 'visit_cancelled' && {
            siteVisitStatus: 'not_scheduled' as const,
            visitDate: null,
            visitConfirmationDate: null,
          }),
        }
        if (existingCrm) {
          await tx.update(leadCrmDetails).set(crmUpdate).where(eq(leadCrmDetails.leadId, visit.leadId))
        } else {
          await tx.insert(leadCrmDetails).values({ leadId: visit.leadId, ...crmUpdate })
        }
      }
      return savedVisit
    })
    const changes = this.leadActivityService.diff(
      {
        status: visit.status,
        outcome: visit.outcome,
        scheduled_date: visit.scheduledDate,
        cancellation_reason: visit.cancellationReason,
        follow_up_date: visit.followUpDate,
        feedback: visit.feedback,
        rating: visit.rating,
      },
      {
        status: updated.status,
        outcome: updated.outcome,
        scheduled_date: updated.scheduledDate,
        cancellation_reason: updated.cancellationReason,
        follow_up_date: updated.followUpDate,
        feedback: updated.feedback,
        rating: updated.rating,
      },
      this.visitActivityLabels,
    )
    if (Object.keys(changes).length > 0) {
      await this.leadActivityService.record({
        leadId: visit.leadId,
        actorUserId: user.id,
        eventType: 'site_visit_updated',
        source: 'site_visit',
        title: 'Site visit updated',
        description: `${Object.keys(changes).length} site visit field(s) changed.`,
        changes,
        metadata: { site_visit_id: visit.id },
      })
    }
    return { visit: serializeVisit(updated) }
  }
}
