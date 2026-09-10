import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { DashboardService } from './dashboard.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

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

  // Open to any authenticated user: super admins may select any executive,
  // while everyone else is scoped to their own performance inside the service.
  @Get('employee-performance')
  @ApiOperation({ summary: 'Get employee performance analysis' })
  getEmployeePerformance(
    @CurrentUser() user: { id: string; role: string },
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('listOnly') listOnly?: string,
    @Query('period') period?: string,
  ): Promise<unknown> {
    return this.dashboardService.getEmployeePerformance(user, employeeId, startDate, endDate, listOnly === 'true', period)
  }
}
