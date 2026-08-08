import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { HrmApiKeyGuard } from '../../common/guards/hrm-api-key.guard'
import { HrmActivityService } from './hrm-activity.service'

@ApiTags('HRM Integration')
@ApiBearerAuth()
@UseGuards(HrmApiKeyGuard)
@Controller('hrm')
export class HrmController {
  constructor(private readonly activityService: HrmActivityService) {}

  @Get('activity')
  @ApiOperation({ summary: 'Return bounded daily CRM activity aggregates for HRM' })
  @ApiQuery({ name: 'from', required: true, example: '2026-08-01' })
  @ApiQuery({ name: 'to', required: true, example: '2026-08-08' })
  getActivity(@Query('from') from?: string, @Query('to') to?: string) {
    return this.activityService.getActivity(from, to)
  }
}
