import { Module } from '@nestjs/common'
import { WebsiteLeadSyncService } from './website-lead-sync.service'

@Module({
  providers: [WebsiteLeadSyncService],
})
export class WebsiteLeadSyncModule {}
