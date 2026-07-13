import { Module } from '@nestjs/common'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { EmployeeReportInsightsService } from './employee-report-insights.service'

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, EmployeeReportInsightsService],
  exports: [DashboardService],
})
export class DashboardModule {}
