import { db } from '@Intelligent-QA-Assistant/db'
import {
  qaDocumentChunks,
  qaDocuments,
} from '@Intelligent-QA-Assistant/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { cosineDistance } from 'drizzle-orm/sql/functions'

import type {
  ChunkRetriever,
  RetrievedChunk,
  SourceReference,
} from '@Intelligent-QA-Assistant/ai'

const TOP_K = 6

export const chunkRetriever: ChunkRetriever = {
  async retrieve(input) {
    const distance = cosineDistance(
      qaDocumentChunks.embedding,
      input.questionEmbedding,
    )

    const rows = await db
      .select({
        documentId: qaDocumentChunks.documentId,
        content: qaDocumentChunks.content,
        pageNumber: qaDocumentChunks.pageNumber,
        fileName: qaDocuments.fileName,
        distance,
      })
      .from(qaDocumentChunks)
      .innerJoin(qaDocuments, eq(qaDocumentChunks.documentId, qaDocuments.id))
      .where(
        and(
          eq(qaDocumentChunks.userId, input.userId),
          eq(qaDocuments.status, 'ready'),
          input.documentIds?.length
            ? inArray(qaDocumentChunks.documentId, input.documentIds)
            : undefined,
        ),
      )
      .orderBy(distance)
      .limit(input.topK ?? TOP_K)

    return rows.map(
      (row): RetrievedChunk => ({
        documentId: row.documentId,
        content: row.content,
        pageNumber: row.pageNumber,
        fileName: row.fileName,
        distance: Number(row.distance),
      }),
    )
  },
}

export function dedupeSources(chunks: RetrievedChunk[]): SourceReference[] {
  const seen = new Set<string>()
  const sources: SourceReference[] = []

  for (const chunk of chunks) {
    const key = `${chunk.fileName}:${chunk.pageNumber ?? 'none'}`
    if (seen.has(key)) continue
    seen.add(key)
    sources.push({
      name: chunk.fileName,
      page: chunk.pageNumber ?? undefined,
    })
    if (sources.length === 3) break
  }

  return sources
}
