import { Module } from '@nestjs/common'
import { ClientsController } from './clients.controller'
import { ClientsService } from './clients.service'
import { LeadActivityModule } from '../lead-activity/lead-activity.module'
import { MetaConversionModule } from '../meta-conversion/meta-conversion.module'

@Module({
  imports: [LeadActivityModule, MetaConversionModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
