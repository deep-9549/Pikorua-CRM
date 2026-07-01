import { Module } from '@nestjs/common'
import { ClientsController } from './clients.controller'
import { ClientsService } from './clients.service'
import { LeadActivityModule } from '../lead-activity/lead-activity.module'

@Module({
  imports: [LeadActivityModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
