import { Controller, ForbiddenException, Get, Patch, Post, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { MetaLeadsService } from './meta-leads.service'
import { AssignLeadDto } from './dto/assign-lead.dto'
import { BulkAssignDto } from './dto/bulk-assign.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { isMetaLeadPoolStatus } from '../leads/lead-pools'
import { ClientSmartInsightsService } from './client-smart-insights.service'

function toStringArray(value: string | string[] | undefined) {
  if (!value) return undefined
  const values = (Array.isArray(value) ? value : [value]).flatMap(item => item.split(','))
  const cleaned = values.map(item => item.trim()).filter(Boolean)
  return cleaned.length > 0 ? cleaned : undefined
}

function toLimit(value: string | undefined) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function toBoolean(value: string | undefined) {
  return value === 'true' || value === '1'
}

@ApiTags('Meta Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('meta-leads')
export class MetaLeadsController {
  constructor(
    private readonly metaLeadsService: MetaLeadsService,
    private readonly clientSmartInsightsService: ClientSmartInsightsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List meta leads (optionally filter by status)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'unassigned',
      'assigned',
      'converted',
      'rejected',
      'cold_pool',
      'lost_pool',
      'not_interested_pool',
      'broker_pool',
      'construction_biz_owner_pool',
    ],
  })
  findAll(
    @CurrentUser() user: { id: string; role: string },
    @Query('status') status?: string,
    @Query('include_pools') includePools?: string,
    @Query('trash') trash?: string,
  ) {
    return this.metaLeadsService.findAll(status, user, {
      includePools: toBoolean(includePools),
      trash: toBoolean(trash),
    })
  }

  @Get(':id/property-recommendations')
  @ApiOperation({ summary: 'Recommend properties for a lead' })
  async propertyRecommendations(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Query('budget_range') budgetRange?: string,
    @Query('configuration') configuration?: string | string[],
    @Query('preferred_locations') preferredLocations?: string | string[],
    @Query('current_area') currentArea?: string,
    @Query('current_city') currentCity?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.metaLeadsService.propertyRecommendations(id, {
      budgetRange,
      configuration: toStringArray(configuration),
      preferredLocations: toStringArray(preferredLocations),
      currentArea,
      currentCity,
      limit: toLimit(limit),
    })

    if (user.role !== 'super_admin' && result.lead?.assigned_to !== user.id && !isMetaLeadPoolStatus(result.lead?.status)) {
      throw new ForbiddenException('You can only view leads assigned to you')
    }

    return { recommendations: result.recommendations }
  }

  @Post(':id/ai-smart-insights')
  @ApiOperation({ summary: 'Generate AI sales insights from an authorized client and ranked projects' })
  async aiSmartInsights(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Body() input: Record<string, unknown>,
  ) {
    const result = await this.metaLeadsService.findOne(id)
    if (user.role !== 'super_admin' && result.lead?.assigned_to !== user.id && !isMetaLeadPoolStatus(result.lead?.status)) {
      throw new ForbiddenException('You can only analyze leads assigned to you')
    }
    return this.clientSmartInsightsService.analyze(input)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get meta lead by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: { id: string; role: string }) {
    const result = await this.metaLeadsService.findOne(id)
    // A sales executive may only open leads assigned to them.
    if (user.role !== 'super_admin' && result.lead?.assigned_to !== user.id && !isMetaLeadPoolStatus(result.lead?.status)) {
      throw new ForbiddenException('You can only view leads assigned to you')
    }
    return result
  }

  @Get(':id/detail')
  @ApiOperation({ summary: 'Get a lead with CRM, client profile and history in one call' })
  async detail(@Param('id') id: string, @CurrentUser() user: { id: string; role: string }) {
    const result = await this.metaLeadsService.detail(id)
    // A sales executive may only open leads assigned to them.
    if (user.role !== 'super_admin' && result.lead?.assigned_to !== user.id && !isMetaLeadPoolStatus(result.lead?.status)) {
      throw new ForbiddenException('You can only view leads assigned to you')
    }
    return result
  }

  @Post(':id/assign')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Assign a lead to an employee' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignLeadDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.metaLeadsService.assign(id, user.id, dto)
  }

  @Post('bulk-assign')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Bulk assign leads to an employee' })
  bulkAssign(@Body() dto: BulkAssignDto, @CurrentUser() user: { id: string }) {
    return this.metaLeadsService.bulkAssign(user.id, dto)
  }

  @Post(':id/unassign')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Unassign a lead and return it to the unassigned queue' })
  unassign(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.metaLeadsService.unassign(id, user.id)
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
