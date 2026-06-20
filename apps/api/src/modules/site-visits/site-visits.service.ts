import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, desc, isNull, and } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { siteVisits, leadCrmDetails } from '@pikorua/db'
import { CreateSiteVisitDto } from './dto/create-site-visit.dto'
import { UpdateSiteVisitDto } from './dto/update-site-visit.dto'
import { serializeMetaLead } from '../leads/lead.serializer'
import { serializeProfile } from '../../common/serializers/profile.serializer'

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
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

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

  async create(dto: CreateSiteVisitDto, currentUserId: string) {
    const scheduledDate =
      dto.scheduled_date ??
      dto.visit_date ??
      dto.visit_confirmation_date ??
      new Date().toISOString()
    const visitStatus = dto.site_visit_status === 'visited' ? 'completed' : 'scheduled'

    const [visit] = await this.db.insert(siteVisits).values({
      tenantId: DEFAULT_TENANT_ID,
      leadId: dto.lead_id,
      employeeId: dto.employee_id ?? currentUserId,
      propertyId: dto.property_id ?? null,
      scheduledDate: new Date(scheduledDate),
      notes: dto.notes ?? null,
      status: visitStatus,
    }).returning()
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
          ...(dto.outcome === 'visit_done' && { siteVisitStatus: 'completed' as const, visitDate: visit.scheduledDate }),
          ...(dto.outcome === 'visit_rescheduled' && {
            siteVisitStatus: 'scheduled' as const,
            visitConfirmationDate: dto.rescheduled_date ? new Date(dto.rescheduled_date) : visit.scheduledDate,
          }),
          ...(dto.outcome === 'visit_cancelled' && { siteVisitStatus: 'not_scheduled' as const }),
        }
        if (existingCrm) {
          await tx.update(leadCrmDetails).set(crmUpdate).where(eq(leadCrmDetails.leadId, visit.leadId))
        } else {
          await tx.insert(leadCrmDetails).values({ leadId: visit.leadId, ...crmUpdate })
        }
      }
      return savedVisit
    })
    return { visit: serializeVisit(updated) }
  }
}
