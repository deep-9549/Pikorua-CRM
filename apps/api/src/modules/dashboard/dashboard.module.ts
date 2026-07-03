import { Module } from '@nestjs/common'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { AiAnalyticsService } from './ai-analytics.service'

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, AiAnalyticsService],
  exports: [DashboardService, AiAnalyticsService],
})
export class DashboardModule {}
