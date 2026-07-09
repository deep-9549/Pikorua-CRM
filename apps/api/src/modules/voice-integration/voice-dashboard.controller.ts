import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common'
import { VoiceIntegrationService } from './voice-integration.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
@Controller('ai-voice')
export class VoiceDashboardController {
  constructor(private readonly voiceService: VoiceIntegrationService) {}

  @Get('queue')
  queue(
    @CurrentUser() user: { id: string; role: string },
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.voiceService.getQueue(user, query)
  }

  @Get('calls/:id')
  callDetail(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.voiceService.getCallDetail(id, user)
  }

  @Delete('calls/:id')
  deleteCallLog(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.voiceService.deleteCallLog(id, user)
  }

  @Patch('calls/:id/reviewed')
  setReviewed(
    @Param('id') id: string,
    @Body() body: { reviewed?: boolean },
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.voiceService.setReviewed(id, Boolean(body.reviewed), user)
  }

  @Patch('scores/:id/override')
  overrideScore(
    @Param('id') id: string,
    @Body() body: { label?: string; reason?: string },
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.voiceService.overrideScore(id, body, user)
  }

  @Get('alerts')
  alerts(
    @CurrentUser() user: { id: string; role: string },
    @Query('unread') unread?: string,
  ) {
    return this.voiceService.getAlerts(user, unread === 'true')
  }

  @Patch('alerts/:id/read')
  markAlertRead(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.voiceService.markAlertRead(id, user)
  }
}
