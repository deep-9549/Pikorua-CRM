import { Controller, Get, Post, Patch, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { LeadsService } from './leads.service'
import { CreateLeadDto } from './dto/create-lead.dto'
import { UpdateLeadDto } from './dto/update-lead.dto'
import { CreateLeadNoteDto } from './dto/create-lead-note.dto'
import { CreateFollowUpDto } from './dto/create-follow-up.dto'
import { CompleteFollowUpDto } from './dto/complete-follow-up.dto'
import { BulkLeadIdsDto } from './dto/bulk-lead-ids.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

function toBoolean(value: string | undefined) {
  return value === 'true' || value === '1'
}

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @ApiOperation({ summary: 'List all leads' })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @CurrentUser() user: { id: string; role: string },
    @Query('status') status?: string,
    @Query('include_pools') includePools?: string,
  ) {
    return this.leadsService.findAll(status, user, toBoolean(includePools))
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead by ID' })
  findOne(@Param('id') id: string) {
    return this.leadsService.findCrm(id)
  }

  @Post()
  @ApiOperation({ summary: 'Create a new lead' })
  create(
    @Body() dto: CreateLeadDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.leadsService.create(dto, user)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update lead CRM details' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.leadsService.update(id, dto, user)
  }

  @Delete(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Permanently delete a lead and all its related records' })
  remove(@Param('id') id: string) {
    return this.leadsService.remove(id)
  }

  @Post('bulk-delete')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Permanently delete selected unassigned leads' })
  removeUnassignedBulk(@Body() dto: BulkLeadIdsDto) {
    return this.leadsService.removeUnassignedBulk(dto.lead_ids)
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'Get notes for a lead' })
  getNotes(@Param('id') id: string) {
    return this.leadsService.getNotes(id)
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add a note to a lead' })
  addNote(
    @Param('id') id: string,
    @Body() dto: CreateLeadNoteDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.leadsService.addNote(id, user.id, dto)
  }

  @Get(':id/follow-ups')
  @ApiOperation({ summary: 'Get the complete follow-up timeline for a lead' })
  getFollowUps(@Param('id') id: string, @CurrentUser() user: { id: string; role: string }) {
    return this.leadsService.getFollowUps(id, user)
  }

  @Post(':id/follow-ups')
  @ApiOperation({ summary: 'Schedule another follow-up for a lead' })
  createFollowUp(
    @Param('id') id: string,
    @Body() dto: CreateFollowUpDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.leadsService.createFollowUp(id, dto, user)
  }

  @Patch(':id/follow-ups/:followUpId/complete')
  @ApiOperation({ summary: 'Complete a scheduled follow-up and retain it in history' })
  completeFollowUp(
    @Param('id') id: string,
    @Param('followUpId') followUpId: string,
    @Body() dto: CompleteFollowUpDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.leadsService.completeFollowUp(id, followUpId, dto, user)
  }
}
