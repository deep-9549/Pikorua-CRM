import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { DashboardService } from './dashboard.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

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
}
