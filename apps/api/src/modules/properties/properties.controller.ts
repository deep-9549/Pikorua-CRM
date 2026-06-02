import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { PropertiesService } from './properties.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('Properties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  @ApiOperation({ summary: 'List all properties' })
  @ApiQuery({ name: 'status', required: false, enum: ['available', 'sold', 'reserved', 'upcoming'] })
  findAll(@Query('status') status?: string) {
    return this.propertiesService.findAll(status)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get property by ID' })
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id)
  }
}
