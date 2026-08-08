import { Module } from '@nestjs/common'
import { HrmApiKeyGuard } from '../../common/guards/hrm-api-key.guard'
import { HrmActivityService } from './hrm-activity.service'
import { HrmController } from './hrm.controller'

@Module({
  controllers: [HrmController],
  providers: [HrmActivityService, HrmApiKeyGuard],
})
export class HrmModule {}
