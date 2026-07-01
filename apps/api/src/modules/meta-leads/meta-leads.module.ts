import { Module } from '@nestjs/common'
import { MetaLeadsController } from './meta-leads.controller'
import { MetaLeadsService } from './meta-leads.service'
import { ClientsModule } from '../clients/clients.module'
import { LeadActivityModule } from '../lead-activity/lead-activity.module'

@Module({
  imports: [ClientsModule, LeadActivityModule],
  controllers: [MetaLeadsController],
  providers: [MetaLeadsService],
  exports: [MetaLeadsService],
})
export class MetaLeadsModule {}
