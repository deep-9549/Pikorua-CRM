import { Module } from '@nestjs/common'
import { SiteVisitsController } from './site-visits.controller'
import { SiteVisitsService } from './site-visits.service'
import { LeadActivityModule } from '../lead-activity/lead-activity.module'

@Module({
  imports: [LeadActivityModule],
  controllers: [SiteVisitsController],
  providers: [SiteVisitsService],
  exports: [SiteVisitsService],
})
export class SiteVisitsModule {}
