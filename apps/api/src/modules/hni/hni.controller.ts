import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CreateHniActivityDto, UpsertHniProfileDto } from './dto/hni.dto'
import { HniService } from './hni.service'

@ApiTags('HNI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
@Controller('hni')
export class HniController {
  constructor(private readonly service: HniService) {}
  @Get() findAll() { return this.service.findAll() }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id) }
  @Post() create(@Body() dto: UpsertHniProfileDto, @CurrentUser() user: { id: string }) { return this.service.create(dto, user.id) }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpsertHniProfileDto) { return this.service.update(id, dto) }
  @Post(':id/activities') addActivity(@Param('id') id: string, @Body() dto: CreateHniActivityDto, @CurrentUser() user: { id: string }) {
    return this.service.addActivity(id, dto, user.id)
  }
}
