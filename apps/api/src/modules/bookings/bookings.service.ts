import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { eq, desc, isNull, and } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { bookings, metaLeads, properties, userProfiles } from '@pikorua/db'
import { CreateBookingDto } from './dto/create-booking.dto'
import { UpdateBookingDto } from './dto/update-booking.dto'
import { serializeMetaLead } from '../leads/lead.serializer'
import { serializeProfile } from '../../common/serializers/profile.serializer'
import { LeadActivityService } from '../lead-activity/lead-activity.service'

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000'

type BookingUser = { id: string; role: string; tenantId?: string | null }

function serializeBooking(booking: any) {
  return {
    id: booking.id,
    lead_id: booking.leadId,
    property_id: booking.propertyId,
    assigned_to: booking.assignedTo,
    amount: Number(booking.amount),
    commission: booking.commission == null ? 0 : Number(booking.commission),
    status: booking.status,
    booked_at: booking.bookedAt,
    created_at: booking.createdAt,
    updated_at: booking.updatedAt,
    lead: serializeMetaLead(booking.lead),
    property: booking.property ?? null,
    assigned_employee: serializeProfile(booking.assignedEmployee),
  }
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly leadActivityService: LeadActivityService,
  ) {}

  private get db() { return this.database.db }

  async findAll(status: string | undefined, user: BookingUser) {
    const tenantId = user.tenantId ?? DEFAULT_TENANT_ID
    const conditions = [isNull(bookings.deletedAt), eq(bookings.tenantId, tenantId)]
    if (user.role !== 'super_admin') conditions.push(eq(bookings.assignedTo, user.id))
    if (status) conditions.push(eq(bookings.status, status as never))

    const rows = await this.db.query.bookings.findMany({
      where: and(...conditions),
      with: {
        lead: { with: { assignedToProfile: true, crmDetails: true } },
        property: true,
        assignedEmployee: true,
      },
      orderBy: [desc(bookings.bookedAt)],
    })
    return { bookings: rows.map(serializeBooking) }
  }

  async create(dto: CreateBookingDto, user: BookingUser) {
    const tenantId = user.tenantId ?? DEFAULT_TENANT_ID
    const lead = await this.db.query.metaLeads.findFirst({
      where: and(eq(metaLeads.id, dto.lead_id), isNull(metaLeads.deletedAt)),
    })
    if (!lead) throw new BadRequestException('Select a valid, active lead')

    const property = await this.db.query.properties.findFirst({
      where: and(
        eq(properties.id, dto.property_id),
        eq(properties.tenantId, tenantId),
        isNull(properties.deletedAt),
      ),
    })
    if (!property) throw new BadRequestException('Select a valid property')
    if (property.status === 'sold') throw new BadRequestException('This property is already marked as sold')

    const assignedTo = dto.assigned_to ?? lead.assignedTo ?? null
    if (assignedTo) {
      const assignee = await this.db.query.userProfiles.findFirst({
        where: and(
          eq(userProfiles.id, assignedTo),
          eq(userProfiles.role, 'sales_executive'),
          eq(userProfiles.status, 'active'),
          isNull(userProfiles.deletedAt),
        ),
      })
      if (!assignee) throw new BadRequestException('Assigned advisor must be an active sales executive')
    }

    const [booking] = await this.db.insert(bookings).values({
      tenantId,
      leadId: dto.lead_id,
      propertyId: dto.property_id,
      assignedTo,
      amount: String(dto.amount),
      commission: dto.commission ? String(dto.commission) : null,
      status: dto.status ?? 'pending',
      ...(dto.booked_at ? { bookedAt: new Date(dto.booked_at) } : {}),
    }).returning()

    await this.leadActivityService.record({
      leadId: dto.lead_id,
      actorUserId: user.id,
      eventType: 'crm_updated',
      source: 'booking',
      title: dto.status === 'confirmed' ? 'Booking confirmed' : 'Booking created',
      description: `${property.name} booking recorded for INR ${dto.amount.toLocaleString('en-IN')}.`,
      changes: {
        booking_status: { label: 'Booking Status', from: null, to: dto.status ?? 'pending' },
        booking_amount: { label: 'Booking Amount', from: null, to: dto.amount },
      },
      metadata: { booking_id: booking.id, property_id: property.id },
    })

    return { booking: await this.findOneForResponse(booking.id) }
  }

  async update(id: string, dto: UpdateBookingDto, user: BookingUser) {
    const tenantId = user.tenantId ?? DEFAULT_TENANT_ID
    const booking = await this.db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, id),
        eq(bookings.tenantId, tenantId),
        isNull(bookings.deletedAt),
      ),
    })
    if (!booking) throw new NotFoundException(`Booking ${id} not found`)

    const [updated] = await this.db
      .update(bookings)
      .set({
        ...(dto.status !== undefined && { status: dto.status as never }),
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning()

    if (dto.status !== undefined && dto.status !== booking.status) {
      await this.leadActivityService.record({
        leadId: booking.leadId,
        actorUserId: user.id,
        eventType: 'crm_updated',
        source: 'booking',
        title: `Booking ${dto.status}`,
        description: `Booking status changed from ${booking.status} to ${dto.status}.`,
        changes: {
          booking_status: { label: 'Booking Status', from: booking.status, to: dto.status },
        },
        metadata: { booking_id: booking.id, property_id: booking.propertyId },
      })
    }

    return { booking: await this.findOneForResponse(updated.id) }
  }

  private async findOneForResponse(id: string) {
    const booking = await this.db.query.bookings.findFirst({
      where: eq(bookings.id, id),
      with: {
        lead: { with: { assignedToProfile: true, crmDetails: true } },
        property: true,
        assignedEmployee: true,
      },
    })
    if (!booking) throw new NotFoundException(`Booking ${id} not found`)
    return serializeBooking(booking)
  }
}
