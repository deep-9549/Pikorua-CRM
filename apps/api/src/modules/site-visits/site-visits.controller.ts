import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { SiteVisitsService } from './site-visits.service'
import { CreateSiteVisitDto } from './dto/create-site-visit.dto'
import { UpdateSiteVisitDto } from './dto/update-site-visit.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('Site Visits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('site-visits')
export class SiteVisitsController {
  constructor(private readonly siteVisitsService: SiteVisitsService) {}

  @Get()
  @ApiOperation({ summary: 'List all site visits' })
  @ApiQuery({ name: 'status', required: false, enum: ['scheduled', 'completed', 'cancelled', 'no_show'] })
  findAll(@Query('status') status?: string) {
    return this.siteVisitsService.findAll(status)
  }

  @Post()
  @Roles('super_admin')
  @ApiOperation({ summary: 'Schedule a site visit' })
  create(@Body() dto: CreateSiteVisitDto, @CurrentUser() user: { id: string }) {
    return this.siteVisitsService.create(dto, user.id)
  }

  @Patch(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update a site visit (status, feedback, rating)' })
  update(@Param('id') id: string, @Body() dto: UpdateSiteVisitDto) {
    return this.siteVisitsService.update(id, dto)
  }
}
