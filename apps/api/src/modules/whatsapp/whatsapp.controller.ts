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
  findAll() {
    return this.whatsappService.findAllConversations()
  }

  @Get('conversations/:leadId')
  @ApiOperation({ summary: 'Get conversation for a lead' })
  findByLead(@Param('leadId') leadId: string) {
    return this.whatsappService.findConversationByLeadId(leadId)
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a WhatsApp message' })
  sendMessage(@Body() dto: SendMessageDto, @CurrentUser() user: { id: string }) {
    return this.whatsappService.sendMessage(user.id, dto)
  }
}
