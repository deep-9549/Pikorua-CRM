import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, desc } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { conversations, messages } from '@pikorua/db'
import { SendMessageDto } from './dto/send-message.dto'

@Injectable()
export class WhatsappService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  async findAllConversations() {
    return this.db.query.conversations.findMany({
      with: { lead: true },
      orderBy: [desc(conversations.lastMessageAt)],
    })
  }

  async findConversationByLeadId(leadId: string) {
    const conversation = await this.db.query.conversations.findFirst({
      where: eq(conversations.leadId, leadId),
      with: {
        lead: true,
        messages: {
          with: { sender: true },
          orderBy: [desc(messages.sentAt)],
          limit: 100,
        },
      },
    })
    if (!conversation) throw new NotFoundException(`No conversation found for lead ${leadId}`)
    return conversation
  }

  async sendMessage(senderId: string, dto: SendMessageDto) {
    const conversation = await this.db.query.conversations.findFirst({
      where: eq(conversations.id, dto.conversation_id),
    })
    if (!conversation) throw new NotFoundException(`Conversation ${dto.conversation_id} not found`)

    const [message] = await this.db.insert(messages).values({
      conversationId: dto.conversation_id,
      senderId,
      senderType: 'employee',
      type: (dto.type as never) ?? 'text',
      content: dto.content,
      status: 'sent',
    }).returning()

    await this.db
      .update(conversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, dto.conversation_id))

    return message
  }
}
