import { Controller, Get, Patch, Put, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator'
import { CLIENT_STATUS_INPUT_VALUES } from '@pikorua/shared'
import { ClientsService } from './clients.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

class UpdateStatusDto {
  @IsIn(CLIENT_STATUS_INPUT_VALUES) @IsOptional() status?: string | null
  @IsString() @IsOptional() status_note?: string
  @IsBoolean() @IsOptional() anti_broker?: boolean
  @IsBoolean() @IsOptional() construction_business_owner?: boolean
  @IsUUID() @IsOptional() origin_lead_id?: string
}

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get client profile with lead history' })
  findOne(@Param('id') id: string) { return this.clientsService.findOne(id) }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update client status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentUser() user: { id: string }) {
    return this.clientsService.updateStatus(id, user.id, dto)
  }
}
