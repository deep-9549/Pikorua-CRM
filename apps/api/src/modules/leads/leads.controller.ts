import { Controller, Get, Post, Patch, Put, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { LeadsService } from './leads.service'
import { CreateLeadDto } from './dto/create-lead.dto'
import { UpdateLeadDto } from './dto/update-lead.dto'
import { CreateLeadNoteDto } from './dto/create-lead-note.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @ApiOperation({ summary: 'List all leads' })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query('status') status?: string) {
    return this.leadsService.findAll(status)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead by ID' })
  findOne(@Param('id') id: string) {
    return this.leadsService.findCrm(id)
  }

  @Post()
  @ApiOperation({ summary: 'Create a new lead' })
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update lead CRM details' })
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(id, dto)
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
}
