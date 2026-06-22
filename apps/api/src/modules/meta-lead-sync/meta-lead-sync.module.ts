import { Module } from '@nestjs/common'
import { MetaGraphService } from './meta-graph.service'
import { MetaLeadImporterService } from './meta-lead-importer.service'
import { MetaLeadSyncController } from './meta-lead-sync.controller'
import { MetaLeadSyncService } from './meta-lead-sync.service'

@Module({
  controllers: [MetaLeadSyncController],
  providers: [MetaGraphService, MetaLeadImporterService, MetaLeadSyncService],
  exports: [MetaGraphService, MetaLeadImporterService],
})
export class MetaLeadSyncModule {}
