import { db } from '@Intelligent-QA-Assistant/db'
import { qaIngestionJobs } from '@Intelligent-QA-Assistant/db/schema'
import { eq } from 'drizzle-orm'

import type {
  IngestionJobRecord,
  IngestionJobRepository,
} from '@Intelligent-QA-Assistant/ai'

function toIngestionJobRecord(
  row: typeof qaIngestionJobs.$inferSelect,
): IngestionJobRecord {
  return {
    id: row.id,
    documentId: row.documentId,
    userId: row.userId,
    attempts: row.attempts,
  }
}

export const ingestionJobRepository: IngestionJobRepository = {
  async listPending(limit) {
    const rows = await db.query.qaIngestionJobs.findMany({
      where: (table, { eq: equals }) => equals(table.status, 'pending'),
      orderBy: (table, { asc }) => [asc(table.createdAt)],
      limit,
    })

    return rows.map(toIngestionJobRecord)
  },
  async getById(input) {
    const row = await db.query.qaIngestionJobs.findFirst({
      where: (table, { eq: equals }) => equals(table.id, input.jobId),
    })

    return row ? toIngestionJobRecord(row) : null
  },
  async markRunning(input) {
    await db
      .update(qaIngestionJobs)
      .set({
        status: 'running',
        attempts: input.attempts,
        lockedAt: input.at,
        startedAt: input.at,
        updatedAt: input.at,
      })
      .where(eq(qaIngestionJobs.id, input.jobId))
  },
  async markCompleted(input) {
    await db
      .update(qaIngestionJobs)
      .set({
        status: 'completed',
        completedAt: input.at,
        lastError: null,
        updatedAt: input.at,
      })
      .where(eq(qaIngestionJobs.id, input.jobId))
  },
  async markFailed(input) {
    await db
      .update(qaIngestionJobs)
      .set({
        status: 'failed',
        lastError: input.errorMessage,
        updatedAt: input.at,
      })
      .where(eq(qaIngestionJobs.id, input.jobId))
  },
}
