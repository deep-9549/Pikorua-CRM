import { Controller, ForbiddenException, Get, Patch, Post, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { MetaLeadsService } from './meta-leads.service'
import { AssignLeadDto } from './dto/assign-lead.dto'
import { BulkAssignDto } from './dto/bulk-assign.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('Meta Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meta-leads')
export class MetaLeadsController {
  constructor(private readonly metaLeadsService: MetaLeadsService) {}

  @Get()
  @ApiOperation({ summary: 'List meta leads (optionally filter by status)' })
  @ApiQuery({ name: 'status', required: false, enum: ['unassigned', 'assigned', 'converted', 'rejected'] })
  findAll(@Query('status') status?: string) {
    return this.metaLeadsService.findAll(status)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get meta lead by ID' })
  findOne(@Param('id') id: string) {
    return this.metaLeadsService.findOne(id)
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign a lead to an employee' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignLeadDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can assign leads')
    }

    return this.metaLeadsService.assign(id, user.id, dto)
  }

  @Post('bulk-assign')
  @ApiOperation({ summary: 'Bulk assign leads to an employee' })
  bulkAssign(@Body() dto: BulkAssignDto, @CurrentUser() user: { id: string; role: string }) {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can assign leads')
    }

    return this.metaLeadsService.bulkAssign(user.id, dto)
  }

  @Patch(':id/convert')
  @ApiOperation({ summary: 'Convert meta lead to CRM lead' })
  convert(@Param('id') id: string) {
    return this.metaLeadsService.convertToCrm(id)
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a meta lead' })
  reject(@Param('id') id: string) {
    return this.metaLeadsService.reject(id)
  }
}
