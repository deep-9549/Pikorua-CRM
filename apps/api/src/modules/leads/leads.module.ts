import { Module } from '@nestjs/common'
import { LeadsController } from './leads.controller'
import { LeadsService } from './leads.service'
import { LeadActivityModule } from '../lead-activity/lead-activity.module'

@Module({
  imports: [LeadActivityModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
