import { db } from '@Intelligent-QA-Assistant/db'
import {
  qaDocumentChunks,
  qaDocuments,
} from '@Intelligent-QA-Assistant/db/schema'
import { and, eq, ilike } from 'drizzle-orm'

import type {
  DocumentRecord,
  DocumentRepository,
} from '@Intelligent-QA-Assistant/ai'

export const documentRepository: DocumentRepository = {
  async getById(input) {
    const row = await db.query.qaDocuments.findFirst({
      where: and(
        eq(qaDocuments.id, input.documentId),
        eq(qaDocuments.userId, input.userId),
      ),
    })

    if (!row) return null

    return {
      id: row.id,
      userId: row.userId,
      storageKey: row.storageKey,
      fileType: row.fileType as DocumentRecord['fileType'],
    }
  },
  async markProcessing(input) {
    await db
      .update(qaDocuments)
      .set({
        status: 'processing',
        errorMessage: null,
        updatedAt: input.at,
      })
      .where(eq(qaDocuments.id, input.documentId))
  },
  async markReady(input) {
    await db
      .update(qaDocuments)
      .set({
        status: 'ready',
        summary: input.summary,
        chunkCount: input.chunkCount,
        errorMessage: null,
        processedAt: input.processedAt,
        updatedAt: input.processedAt,
      })
      .where(eq(qaDocuments.id, input.documentId))
  },
  async markFailed(input) {
    await db
      .update(qaDocuments)
      .set({
        status: 'failed',
        errorMessage: input.errorMessage,
        updatedAt: input.at,
      })
      .where(eq(qaDocuments.id, input.documentId))
  },
  async createChunks(input) {
    if (input.chunks.length === 0) return

    await db.insert(qaDocumentChunks).values(
      input.chunks.map((chunk) => ({
        id: crypto.randomUUID(),
        documentId: input.documentId,
        userId: input.userId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
        pageNumber: chunk.pageNumber ?? null,
        embedding: chunk.embedding,
      })),
    )
  },
  async deleteChunks(input) {
    await db
      .delete(qaDocumentChunks)
      .where(eq(qaDocumentChunks.documentId, input.documentId))
  },
}

export async function listDocumentRows(input: {
  userId: string
  search?: string
  status?: string
  type?: string
}) {
  const filters = [eq(qaDocuments.userId, input.userId)]
  if (input.search) {
    filters.push(ilike(qaDocuments.fileName, `%${input.search}%`))
  }
  if (input.status && input.status !== 'all') {
    filters.push(
      eq(
        qaDocuments.status,
        input.status as typeof qaDocuments.$inferSelect.status,
      ),
    )
  }
  if (input.type && input.type !== 'all') {
    filters.push(eq(qaDocuments.fileType, input.type))
  }

  return db.query.qaDocuments.findMany({
    where: and(...filters),
    orderBy: (table, { desc }) => [desc(table.uploadedAt)],
  })
}

export async function getDocumentRowById(input: {
  userId: string
  documentId: string
}) {
  return db.query.qaDocuments.findFirst({
    where: and(
      eq(qaDocuments.id, input.documentId),
      eq(qaDocuments.userId, input.userId),
    ),
  })
}

export async function deleteDocumentRow(input: {
  userId: string
  documentId: string
}) {
  const row = await getDocumentRowById(input)
  if (!row) return null

  await db.delete(qaDocuments).where(eq(qaDocuments.id, row.id))
  return row
}
