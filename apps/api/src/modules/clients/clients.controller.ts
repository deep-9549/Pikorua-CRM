import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { IsString, IsOptional } from 'class-validator'
import { ClientsService } from './clients.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

class UpdateStatusDto {
  @IsString() status: string
  @IsString() @IsOptional() status_note?: string
}

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get client profile with lead history' })
  findOne(@Param('id') id: string) { return this.clientsService.findOne(id) }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update client status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentUser() user: { id: string }) {
    return this.clientsService.updateStatus(id, user.id, dto.status, dto.status_note)
  }
}
