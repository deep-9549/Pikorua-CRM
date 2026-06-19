import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { WhatsappService } from './whatsapp.service'
import { SendMessageDto } from './dto/send-message.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('WhatsApp')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'List all WhatsApp conversations' })
  findAll(@CurrentUser() user: { id: string; role: string }) {
    return this.whatsappService.findAllConversations(user)
  }

  @Get('conversations/:leadId')
  @ApiOperation({ summary: 'Get conversation for a lead' })
  findByLead(@Param('leadId') leadId: string, @CurrentUser() user: { id: string; role: string }) {
    return this.whatsappService.findConversationByLeadId(leadId, user)
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a WhatsApp message' })
  sendMessage(@Body() dto: SendMessageDto, @CurrentUser() user: { id: string; role: string }) {
    return this.whatsappService.sendMessage(user, dto)
  }
}
