import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { BookingsService } from './bookings.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { UpdateBookingDto } from './dto/update-booking.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @ApiOperation({ summary: 'List all bookings' })
  @ApiQuery({ name: 'status', required: false, enum: ['confirmed', 'pending', 'cancelled'] })
  findAll(
    @CurrentUser() user: { id: string; role: string; tenantId?: string | null },
    @Query('status') status?: string,
  ) {
    return this.bookingsService.findAll(status, user)
  }

  @Post()
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create a new booking' })
  create(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: { id: string; role: string; tenantId?: string | null },
  ) {
    return this.bookingsService.create(dto, user)
  }

  @Patch(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update booking status' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
    @CurrentUser() user: { id: string; role: string; tenantId?: string | null },
  ) {
    return this.bookingsService.update(id, dto, user)
  }
}
