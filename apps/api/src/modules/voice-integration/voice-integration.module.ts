import { Module } from '@nestjs/common'
import { VoiceIntegrationController } from './voice-integration.controller'
import { VoiceDashboardController } from './voice-dashboard.controller'
import { VoiceIntegrationService } from './voice-integration.service'
import { DatabaseModule } from '../../database/database.module'
import { LeadActivityModule } from '../lead-activity/lead-activity.module'

@Module({
  imports: [DatabaseModule, LeadActivityModule],
  controllers: [VoiceIntegrationController, VoiceDashboardController],
  providers: [VoiceIntegrationService],
})
export class VoiceIntegrationModule {}
