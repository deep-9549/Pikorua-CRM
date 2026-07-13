import { Module } from '@nestjs/common'
import { MetaLeadsController } from './meta-leads.controller'
import { MetaLeadsService } from './meta-leads.service'
import { ClientsModule } from '../clients/clients.module'
import { LeadActivityModule } from '../lead-activity/lead-activity.module'
import { ClientSmartInsightsService } from './client-smart-insights.service'

@Module({
  imports: [ClientsModule, LeadActivityModule],
  controllers: [MetaLeadsController],
  providers: [MetaLeadsService, ClientSmartInsightsService],
  exports: [MetaLeadsService],
})
export class MetaLeadsModule {}
