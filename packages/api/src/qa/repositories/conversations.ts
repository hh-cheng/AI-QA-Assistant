import { db } from '@Intelligent-QA-Assistant/db'
import {
  qaConversations,
  qaMessages,
} from '@Intelligent-QA-Assistant/db/schema'
import { and, eq } from 'drizzle-orm'

import type {
  ConversationRecord,
  ConversationRepository,
} from '@Intelligent-QA-Assistant/ai'

function toConversationRecord(
  row: typeof qaConversations.$inferSelect,
): ConversationRecord {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
  }
}

export const conversationRepository: ConversationRepository = {
  async getConversation(input) {
    const row = await db.query.qaConversations.findFirst({
      where: and(
        eq(qaConversations.id, input.conversationId),
        eq(qaConversations.userId, input.userId),
      ),
    })

    return row ? toConversationRecord(row) : null
  },
  async appendUserMessage(input) {
    const messageId = crypto.randomUUID()
    await db.insert(qaMessages).values({
      id: messageId,
      conversationId: input.conversationId,
      userId: input.userId,
      role: 'user',
      content: input.content,
    })

    return { messageId }
  },
  async appendAssistantMessage(input) {
    const messageId = crypto.randomUUID()
    await db.insert(qaMessages).values({
      id: messageId,
      conversationId: input.conversationId,
      userId: input.userId,
      role: 'assistant',
      content: input.content,
      model: input.model,
      responseTimeMs: input.responseTimeMs,
      tokenCount: input.tokenCount,
      sources: input.sources ?? null,
    })

    return { messageId }
  },
  async updateConversationAfterAnswer(input) {
    await db
      .update(qaConversations)
      .set({
        title: input.title,
        selectedScope: input.selectedScope,
        selectedModel: input.selectedModel,
        updatedAt: input.updatedAt,
      })
      .where(eq(qaConversations.id, input.conversationId))
  },
}

export async function listConversationRows(userId: string) {
  return db.query.qaConversations.findMany({
    where: (table, { eq: equals }) => equals(table.userId, userId),
    orderBy: (table, { desc }) => [desc(table.updatedAt)],
  })
}

export async function createConversationRow(input: {
  userId: string
  title: string
  selectedModel: string | null
  createdAt: Date
}) {
  const conversationId = crypto.randomUUID()

  await db.insert(qaConversations).values({
    id: conversationId,
    userId: input.userId,
    title: input.title,
    selectedModel: input.selectedModel,
    selectedScope: null,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  })

  return {
    id: conversationId,
    title: input.title,
    updatedAt: input.createdAt.toISOString(),
  }
}

export async function getConversationRow(input: {
  userId: string
  conversationId: string
}) {
  return db.query.qaConversations.findFirst({
    where: and(
      eq(qaConversations.id, input.conversationId),
      eq(qaConversations.userId, input.userId),
    ),
  })
}

export async function getConversationMessages(conversationId: string) {
  return db.query.qaMessages.findMany({
    where: (table, { eq: equals }) =>
      equals(table.conversationId, conversationId),
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  })
}
