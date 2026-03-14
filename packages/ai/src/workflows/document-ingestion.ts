import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'

import { getErrorMessage } from '../errors'
import type {
  ChunkingService,
  DocumentIngestionInput,
  DocumentIngestionResult,
  DocumentParser,
  DocumentRepository,
  DocumentStorage,
  IngestionJobRepository,
  OpenAIService,
} from '../index'

const inputSchema = z.object({
  jobId: z.string(),
  documentId: z.string(),
  userId: z.string(),
})

const loadedSchema = z.object({
  jobId: z.string(),
  documentId: z.string(),
  userId: z.string(),
  attempts: z.number().int().nonnegative(),
  storageKey: z.string(),
  fileType: z.enum(['TXT', 'MD', 'PDF', 'DOCX']),
})

const parsedSchema = loadedSchema.extend({
  text: z.string(),
  summary: z.string().nullable(),
  chunks: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      content: z.string(),
      tokenEstimate: z.number().int().nonnegative(),
      pageNumber: z.number().int().optional(),
    }),
  ),
})

const persistedSchema = z.object({
  documentId: z.string(),
  chunkCount: z.number().int().nonnegative(),
  summary: z.string().nullable(),
})

const outputSchema = z.object({
  documentId: z.string(),
  chunkCount: z.number().int().nonnegative(),
  summary: z.string().nullable(),
  status: z.enum(['completed', 'failed']),
  errorMessage: z.string().optional(),
})

export type DocumentIngestionWorkflowDeps = {
  documents: DocumentRepository
  jobs: IngestionJobRepository
  storage: DocumentStorage
  parser: DocumentParser
  chunker: ChunkingService
  openAI: OpenAIService
}

export function createDocumentIngestionWorkflow(
  deps: DocumentIngestionWorkflowDeps,
) {
  const loadStep = createStep({
    id: 'load-ingestion-context',
    inputSchema,
    outputSchema: loadedSchema,
    execute: async ({ inputData }) => {
      const job = await deps.jobs.getById({ jobId: inputData.jobId })
      if (!job) {
        throw new Error('Ingestion job not found')
      }

      const document = await deps.documents.getById({
        documentId: inputData.documentId,
        userId: inputData.userId,
      })

      if (!document) {
        throw new Error('Document not found')
      }

      const startedAt = new Date()
      await deps.jobs.markRunning({
        jobId: job.id,
        attempts: job.attempts + 1,
        at: startedAt,
      })
      await deps.documents.markProcessing({
        documentId: document.id,
        at: startedAt,
      })
      await deps.documents.deleteChunks({ documentId: document.id })

      return {
        jobId: job.id,
        documentId: document.id,
        userId: document.userId,
        attempts: job.attempts + 1,
        storageKey: document.storageKey,
        fileType: document.fileType,
      }
    },
  })

  const parseStep = createStep({
    id: 'parse-and-chunk-document',
    inputSchema: loadedSchema,
    outputSchema: parsedSchema,
    execute: async ({ inputData }) => {
      const body = await deps.storage.readObject({
        storageKey: inputData.storageKey,
      })
      const parsed = await deps.parser.extractText({
        fileType: inputData.fileType,
        body,
      })
      const chunks = await deps.chunker.chunkText({
        text: parsed.text,
      })

      return {
        ...inputData,
        text: parsed.text,
        summary:
          parsed.text
            .split(/\n{2,}/)
            .map((paragraph) => paragraph.trim())
            .filter(Boolean)
            .slice(0, 2)
            .join(' ')
            .slice(0, 320) || null,
        chunks,
      }
    },
  })

  const persistStep = createStep({
    id: 'embed-and-persist-chunks',
    inputSchema: parsedSchema,
    outputSchema: persistedSchema,
    execute: async ({ inputData }) => {
      const embeddings = await deps.openAI.createEmbeddings({
        texts: inputData.chunks.map((chunk) => chunk.content),
      })

      await deps.documents.createChunks({
        documentId: inputData.documentId,
        userId: inputData.userId,
        chunks: inputData.chunks.map((chunk, index) => {
          const embedding = embeddings[index]
          if (!embedding) {
            throw new Error(
              `OpenAI embedding request failed: missing embedding for chunk ${index + 1}.`,
            )
          }

          return {
            chunkIndex: chunk.index,
            content: chunk.content,
            tokenCount: chunk.tokenEstimate,
            pageNumber: chunk.pageNumber ?? null,
            embedding,
          }
        }),
      })

      return {
        documentId: inputData.documentId,
        chunkCount: inputData.chunks.length,
        summary: inputData.summary,
      }
    },
  })

  const finalizeStep = createStep({
    id: 'finalize-ingestion',
    inputSchema: persistedSchema,
    outputSchema,
    execute: async ({ inputData, getInitData }) => {
      const initData = getInitData<typeof inputSchema>()
      const finishedAt = new Date()

      await deps.documents.markReady({
        documentId: inputData.documentId,
        summary: inputData.summary,
        chunkCount: inputData.chunkCount,
        processedAt: finishedAt,
      })
      await deps.jobs.markCompleted({
        jobId: initData.jobId,
        at: finishedAt,
      })

      return {
        documentId: inputData.documentId,
        chunkCount: inputData.chunkCount,
        summary: inputData.summary,
        status: 'completed' as const,
      }
    },
  })

  return createWorkflow({
    id: 'document-ingestion-workflow',
    inputSchema,
    outputSchema,
  })
    .then(loadStep)
    .then(parseStep)
    .then(persistStep)
    .then(finalizeStep)
    .commit()
}

export async function runDocumentIngestionWorkflow(input: {
  input: DocumentIngestionInput
  deps: DocumentIngestionWorkflowDeps
}): Promise<DocumentIngestionResult> {
  const workflow = createDocumentIngestionWorkflow(input.deps)

  try {
    const result = await workflow.createRun().start({
      inputData: input.input,
    })

    if (result.status !== 'success') {
      throw result.status === 'failed'
        ? result.error
        : new Error('Workflow suspended unexpectedly')
    }

    return result.result
  } catch (error) {
    const message = getErrorMessage(error, 'Unknown ingestion failure')
    const failedAt = new Date()

    console.error('document ingestion workflow failed', {
      input: input.input,
      message,
      error,
    })

    await input.deps.documents.markFailed({
      documentId: input.input.documentId,
      errorMessage: message,
      at: failedAt,
    })
    await input.deps.jobs.markFailed({
      jobId: input.input.jobId,
      errorMessage: message,
      at: failedAt,
    })

    return {
      documentId: input.input.documentId,
      chunkCount: 0,
      summary: null,
      status: 'failed',
      errorMessage: message,
    }
  }
}
