import { pgTable, uuid, text, timestamp, jsonb, pgEnum, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { metaLeads } from './leads'
import { userProfiles } from './users'

export const messageTypeEnum = pgEnum('message_type', ['text', 'image', 'document', 'voice', 'location'])
export const messageSenderEnum = pgEnum('message_sender', ['lead', 'employee', 'bot'])
export const messageStatusEnum = pgEnum('message_status', ['sent', 'delivered', 'read', 'failed'])

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  leadId: uuid('lead_id').references(() => metaLeads.id).notNull(),
  channel: text('channel').default('whatsapp').notNull(),
  status: text('status').default('open').notNull(),
  aiSentiment: jsonb('ai_sentiment'),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  // Conversations are looked up and access-filtered by their lead.
  index('conversations_lead_id_idx').on(t.leadId),
])

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  senderId: uuid('sender_id').references(() => userProfiles.id, { onDelete: 'set null' }),
  senderType: messageSenderEnum('sender_type').notNull(),
  type: messageTypeEnum('type').default('text').notNull(),
  content: text('content'),
  status: messageStatusEnum('status').default('sent').notNull(),
  aiAnalysis: jsonb('ai_analysis'),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  // Messages are always fetched for a conversation, newest first.
  index('messages_conversation_sent_idx').on(t.conversationId, t.sentAt),
])

// ── Relations ─────────────────────────────────────────────────────────────────

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  lead: one(metaLeads, { fields: [conversations.leadId], references: [metaLeads.id] }),
  messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  sender: one(userProfiles, { fields: [messages.senderId], references: [userProfiles.id] }),
}))
