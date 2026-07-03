import { Module } from '@nestjs/common'
import { MicrositeLeadSyncService } from './microsite-lead-sync.service'

@Module({
  providers: [MicrositeLeadSyncService],
})
export class MicrositeLeadSyncModule {}
