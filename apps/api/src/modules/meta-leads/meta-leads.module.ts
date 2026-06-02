import { Module } from '@nestjs/common'
import { MetaLeadsController } from './meta-leads.controller'
import { MetaLeadsService } from './meta-leads.service'

@Module({
  controllers: [MetaLeadsController],
  providers: [MetaLeadsService],
  exports: [MetaLeadsService],
})
export class MetaLeadsModule {}
