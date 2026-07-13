import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { DashboardService } from './dashboard.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
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

  @Get('employee-performance')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Get employee performance analysis' })
  getEmployeePerformance(
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<unknown> {
    return this.dashboardService.getEmployeePerformance(employeeId, startDate, endDate)
  }
}
