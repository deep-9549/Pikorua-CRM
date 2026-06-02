import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, desc, isNull, and } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { bookings } from '@pikorua/db'
import { CreateBookingDto } from './dto/create-booking.dto'
import { UpdateBookingDto } from './dto/update-booking.dto'

@Injectable()
export class BookingsService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  async findAll(status?: string) {
    const conditions = [isNull(bookings.deletedAt)]
    if (status) conditions.push(eq(bookings.status, status as never))

    return this.db.query.bookings.findMany({
      where: and(...conditions),
      with: {
        lead: true,
        property: true,
        assignedEmployee: true,
      },
      orderBy: [desc(bookings.bookedAt)],
    })
  }

  async create(dto: CreateBookingDto) {
    const [booking] = await this.db.insert(bookings).values({
      tenantId: '00000000-0000-0000-0000-000000000000',
      leadId: dto.lead_id,
      propertyId: dto.property_id,
      assignedTo: dto.assigned_to ?? null,
      amount: String(dto.amount),
      commission: dto.commission ? String(dto.commission) : null,
      status: 'pending',
    }).returning()
    return booking
  }

  async update(id: string, dto: UpdateBookingDto) {
    const booking = await this.db.query.bookings.findFirst({
      where: and(eq(bookings.id, id), isNull(bookings.deletedAt)),
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
    return updated
  }
}
