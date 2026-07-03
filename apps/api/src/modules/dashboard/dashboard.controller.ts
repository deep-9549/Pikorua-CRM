import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { DashboardService } from './dashboard.service'
import { AiAnalyticsQuery, AiAnalyticsService } from './ai-analytics.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly aiAnalyticsService: AiAnalyticsService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard KPI stats' })
  getStats() {
    return this.dashboardService.getStats()
  }

  @Get('leads')
  @ApiOperation({ summary: 'Get leads breakdown by status and campaign' })
  getLeads() {
    return this.dashboardService.getLeadsBreakdown()
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue breakdown and recent bookings' })
  getRevenue() {
    return this.dashboardService.getRevenueBreakdown()
  }

  @Get('employee-performance')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Get employee performance analysis' })
  getEmployeePerformance(@Query('employeeId') employeeId?: string): Promise<unknown> {
    return this.dashboardService.getEmployeePerformance(employeeId)
  }

  @Get('ai-analytics/overview')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Get AI Analytics command-center overview' })
  getAiAnalyticsOverview(@Query() query: AiAnalyticsQuery): Promise<unknown> {
    return this.aiAnalyticsService.getOverview(query)
  }

  @Get('ai-analytics/comparison')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Get AI Analytics current vs comparison metrics' })
  getAiAnalyticsComparison(@Query() query: AiAnalyticsQuery): Promise<unknown> {
    return this.aiAnalyticsService.getComparison(query)
  }

  @Get('ai-analytics/drilldown')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Get AI Analytics grouped aggregate drilldown' })
  getAiAnalyticsDrilldown(@Query() query: AiAnalyticsQuery): Promise<unknown> {
    return this.aiAnalyticsService.getDrilldown(query)
  }

  @Get('ai-analytics/insights')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Get deterministic AI-ready analytics insights' })
  getAiAnalyticsInsights(@Query() query: AiAnalyticsQuery): Promise<unknown> {
    return this.aiAnalyticsService.getInsights(query)
  }
}
