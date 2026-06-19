import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { eq, desc, inArray } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { conversations, messages, metaLeads } from '@pikorua/db'
import { SendMessageDto } from './dto/send-message.dto'

export interface RequestingUser {
  id: string
  role: string
}

@Injectable()
export class WhatsappService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  /**
   * A WhatsApp conversation belongs to whoever the underlying lead is assigned
   * to. Sales executives may only access their own leads' conversations;
   * super_admins may access any. Throws ForbiddenException otherwise.
   */
  private assertLeadAccess(lead: { assignedTo?: string | null } | null, user: RequestingUser) {
    if (user.role === 'super_admin') return
    if (!lead || lead.assignedTo !== user.id) {
      throw new ForbiddenException('You can only access conversations for leads assigned to you')
    }
  }

  async findAllConversations(user: RequestingUser) {
    // Non-admins only see conversations for leads assigned to them.
    const where =
      user.role === 'super_admin'
        ? undefined
        : inArray(
            conversations.leadId,
            this.db
              .select({ id: metaLeads.id })
              .from(metaLeads)
              .where(eq(metaLeads.assignedTo, user.id)),
          )

    return this.db.query.conversations.findMany({
      where,
      with: { lead: true },
      orderBy: [desc(conversations.lastMessageAt)],
    })
  }

  async findConversationByLeadId(leadId: string, user: RequestingUser) {
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
    this.assertLeadAccess(conversation.lead, user)
    return conversation
  }

  async sendMessage(user: RequestingUser, dto: SendMessageDto) {
    const senderId = user.id
    const conversation = await this.db.query.conversations.findFirst({
      where: eq(conversations.id, dto.conversation_id),
      with: { lead: true },
    })
    if (!conversation) throw new NotFoundException(`Conversation ${dto.conversation_id} not found`)
    this.assertLeadAccess(conversation.lead, user)

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
