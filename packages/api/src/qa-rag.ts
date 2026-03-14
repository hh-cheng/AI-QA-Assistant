import { db } from '@Intelligent-QA-Assistant/db'
import {
  qaConversations,
  qaDocumentChunks,
  qaDocuments,
  qaIngestionJobs,
  qaMessages,
  qaUserModelPreferences,
} from '@Intelligent-QA-Assistant/db/schema'
import { env } from '@Intelligent-QA-Assistant/env/server'
import { and, count, eq, gte, ilike, inArray, sql } from 'drizzle-orm'
import { cosineDistance } from 'drizzle-orm/sql/functions'
import { createHash } from 'node:crypto'
import mammoth from 'mammoth'
import pdfParse from 'pdf-parse'

import type {
  ChatMessage,
  ConversationDetail,
  ConversationSummary,
  DocumentDetail,
  DocumentSummary,
  DocumentType,
  QaOverview,
  SourceReference,
  UserModelSettings,
} from './qa'
import {
  getConfiguredModelOptions,
  getDefaultModelEntry,
  requireSupportedModel,
} from './qa-models'
import {
  readDocumentObject,
  removeDocumentObject,
  storeDocumentObject,
} from './qa-storage'

type UploadableFile = {
  name: string
  type: string
  size: number
  arrayBuffer: () => Promise<ArrayBuffer>
}

type RetrievalChunk = {
  content: string
  pageNumber: number | null
  fileName: string
  distance: number
}

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536
const CHUNK_SIZE = 1200
const CHUNK_OVERLAP = 200
const TOP_K = 6
const EMBEDDING_BATCH_SIZE = 16

let ingestionLoopRunning = false

function createId() {
  return crypto.randomUUID()
}

function formatSizeLabel(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
}

function parseDocumentType(fileName: string): DocumentType | null {
  const normalized = fileName.toLowerCase()
  if (normalized.endsWith('.pdf')) return 'PDF'
  if (normalized.endsWith('.docx')) return 'DOCX'
  if (normalized.endsWith('.md') || normalized.endsWith('.markdown'))
    return 'MD'
  if (normalized.endsWith('.txt')) return 'TXT'
  return null
}

function buildStorageKey(userId: string, documentId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `user/${userId}/documents/${documentId}/${safeName}`
}

function describeProviderHttpError(input: {
  provider: string
  operation: string
  status: number
  body: string
}) {
  const prefix = `${input.provider} ${input.operation} failed`

  if (input.status === 401 || input.status === 403) {
    return `${prefix}: authentication failed. Check the API key and provider permissions.`
  }

  if (input.status === 429) {
    return `${prefix}: rate limited or quota exceeded.`
  }

  if (input.status >= 500) {
    return `${prefix}: provider service error (${input.status}).`
  }

  const body = input.body.trim()
  return body
    ? `${prefix}: ${input.status} ${body}`
    : `${prefix}: request returned status ${input.status}.`
}

async function parseJsonResponse<T>(input: {
  provider: string
  operation: string
  response: Response
}) {
  if (!input.response.ok) {
    const body = await input.response.text()
    throw new Error(
      describeProviderHttpError({
        provider: input.provider,
        operation: input.operation,
        status: input.response.status,
        body,
      }),
    )
  }

  try {
    return (await input.response.json()) as T
  } catch {
    throw new Error(
      `${input.provider} ${input.operation} failed: provider returned invalid JSON.`,
    )
  }
}

function describeFetchFailure(input: {
  provider: string
  operation: string
  error: unknown
}) {
  const message =
    input.error instanceof Error ? input.error.message : String(input.error)

  if (
    message.includes('fetch failed') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('ETIMEDOUT')
  ) {
    return `${input.provider} ${input.operation} failed: network request could not reach the provider API.`
  }

  return `${input.provider} ${input.operation} failed: ${message}`
}

function toDocumentSummary(
  row: typeof qaDocuments.$inferSelect,
): DocumentSummary {
  return {
    id: row.id,
    name: row.fileName,
    type: row.fileType as DocumentType,
    sizeLabel: formatSizeLabel(row.fileSizeBytes),
    uploadedAt: row.uploadedAt.toISOString(),
    status: row.status,
    chunks: row.status === 'failed' ? null : row.chunkCount,
  }
}

function toDocumentDetail(
  row: typeof qaDocuments.$inferSelect,
): DocumentDetail {
  return {
    ...toDocumentSummary(row),
    summary: row.summary,
    errorMessage: row.errorMessage,
  }
}

function formatResponseTime(responseTimeMs?: number | null) {
  if (!responseTimeMs) return undefined
  return responseTimeMs >= 1000
    ? `${(responseTimeMs / 1000).toFixed(1)}s`
    : `${responseTimeMs}ms`
}

function toChatMessage(row: typeof qaMessages.$inferSelect): ChatMessage {
  return {
    id: row.id,
    role: row.role as 'user' | 'assistant',
    content: row.content,
    model: row.model ?? undefined,
    tokens: row.tokenCount ?? undefined,
    responseTime: formatResponseTime(row.responseTimeMs),
    sources: row.sources ?? undefined,
  }
}

function chunkText(text: string) {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const segments = normalized
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean)

  const chunks: string[] = []
  let current = ''

  for (const segment of segments) {
    if (!current) {
      current = segment
      continue
    }

    if ((current + '\n\n' + segment).length <= CHUNK_SIZE) {
      current = `${current}\n\n${segment}`
      continue
    }

    if (current.length > CHUNK_SIZE) {
      for (
        let index = 0;
        index < current.length;
        index += CHUNK_SIZE - CHUNK_OVERLAP
      ) {
        chunks.push(current.slice(index, index + CHUNK_SIZE))
      }
      current = segment
      continue
    }

    chunks.push(current)
    current = segment
  }

  if (current) {
    if (current.length <= CHUNK_SIZE) {
      chunks.push(current)
    } else {
      for (
        let index = 0;
        index < current.length;
        index += CHUNK_SIZE - CHUNK_OVERLAP
      ) {
        chunks.push(current.slice(index, index + CHUNK_SIZE))
      }
    }
  }

  return chunks.map((chunk) => chunk.trim()).filter(Boolean)
}

async function extractDocumentText(input: {
  fileType: DocumentType
  body: Buffer
}) {
  switch (input.fileType) {
    case 'PDF': {
      const parsed = await pdfParse(input.body)
      return parsed.text
    }
    case 'DOCX': {
      const parsed = await mammoth.extractRawText({ buffer: input.body })
      return parsed.value
    }
    default:
      return input.body.toString('utf-8')
  }
}

async function createEmbeddings(inputs: string[]) {
  if (inputs.length === 0) {
    return []
  }

  let response: Response
  try {
    response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: inputs,
        dimensions: EMBEDDING_DIMENSIONS,
        encoding_format: 'float',
      }),
    })
  } catch (error) {
    throw new Error(
      describeFetchFailure({
        provider: 'OpenAI',
        operation: 'embedding request',
        error,
      }),
    )
  }

  const json = await parseJsonResponse<{
    data?: Array<{ embedding?: number[]; index?: number }>
  }>({
    provider: 'OpenAI',
    operation: 'embedding request',
    response,
  })

  const data = [...(json.data ?? [])].sort(
    (left, right) => (left.index ?? 0) - (right.index ?? 0),
  )

  if (data.length !== inputs.length) {
    throw new Error(
      `OpenAI embedding request failed: expected ${inputs.length} embeddings but received ${data.length}.`,
    )
  }

  return data.map((item, index) => {
    const embedding = item.embedding
    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `OpenAI embedding request failed: embedding ${index + 1} did not return the expected vector dimensions.`,
      )
    }
    return embedding
  })
}

async function createEmbedding(input: string) {
  const [embedding] = await createEmbeddings([input])
  if (!embedding) {
    throw new Error(
      'OpenAI embedding request failed: response did not contain an embedding.',
    )
  }
  return embedding
}

async function createAnswer(input: {
  modelId: string
  question: string
  responseLength: 'concise' | 'standard' | 'detailed'
  chunks: RetrievalChunk[]
}) {
  const model = requireSupportedModel(input.modelId)
  const tone =
    input.responseLength === 'concise'
      ? 'Answer concisely in 3-5 sentences.'
      : input.responseLength === 'detailed'
        ? 'Answer in detail with clear structure.'
        : 'Answer clearly and directly.'

  const context = input.chunks
    .map(
      (chunk, index) =>
        `[Source ${index + 1}] ${chunk.fileName}${chunk.pageNumber ? ` p.${chunk.pageNumber}` : ''}\n${chunk.content}`,
    )
    .join('\n\n')

  const systemPrompt = `You are a document-grounded assistant. Use only the provided context. If the answer is unavailable in the context, say so. ${tone}`

  if (model.provider === 'openai') {
    let response: Response
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model.model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Question:\n${input.question}\n\nContext:\n${context}`,
            },
          ],
        }),
      })
    } catch (error) {
      throw new Error(
        describeFetchFailure({
          provider: 'OpenAI',
          operation: 'chat completion request',
          error,
        }),
      )
    }

    const json = await parseJsonResponse<{
      choices?: Array<{ message?: { content?: string } }>
      usage?: { total_tokens?: number }
    }>({
      provider: 'OpenAI',
      operation: 'chat completion request',
      response,
    })

    return {
      content:
        json.choices?.[0]?.message?.content?.trim() || 'No answer returned.',
      tokenCount: json.usage?.total_tokens ?? undefined,
      model: model.model,
    }
  }

  if (model.provider === 'anthropic') {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key is not configured')
    }

    let response: Response
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: model.model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `Question:\n${input.question}\n\nContext:\n${context}`,
            },
          ],
        }),
      })
    } catch (error) {
      throw new Error(
        describeFetchFailure({
          provider: 'Anthropic',
          operation: 'message request',
          error,
        }),
      )
    }

    const json = await parseJsonResponse<{
      content?: Array<{ type?: string; text?: string }>
      usage?: { input_tokens?: number; output_tokens?: number }
    }>({
      provider: 'Anthropic',
      operation: 'message request',
      response,
    })

    const content = json.content
      ?.filter((item) => item.type === 'text' && item.text)
      .map((item) => item.text)
      .join('\n')
      .trim()

    return {
      content: content || 'No answer returned.',
      tokenCount:
        (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0) ||
        undefined,
      model: model.model,
    }
  }

  throw new Error(`Unsupported provider: ${model.provider}`)
}

async function getSelectedModelIdForUser(userId: string) {
  const preference = await db.query.qaUserModelPreferences.findFirst({
    where: (table, { eq }) => eq(table.userId, userId),
  })

  if (preference) {
    return `${preference.provider}:${preference.model}`
  }

  return getDefaultModelEntry().id
}

async function summarizeText(text: string) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  return paragraphs.slice(0, 2).join(' ').slice(0, 320) || null
}

export async function saveUploadedDocuments(input: {
  userId: string
  files: UploadableFile[]
}) {
  const created: DocumentSummary[] = []

  for (const file of input.files) {
    const fileType = parseDocumentType(file.name)
    if (!fileType) {
      throw new Error(
        `Unsupported file type for "${file.name}". Allowed types: TXT, MD, PDF, DOCX.`,
      )
    }

    const documentId = createId()
    const body = Buffer.from(await file.arrayBuffer())
    const storageKey = buildStorageKey(input.userId, documentId, file.name)
    const checksum = createHash('sha256').update(body).digest('hex')

    await storeDocumentObject({
      storageKey,
      body,
      contentType: file.type || 'application/octet-stream',
    })

    await db.insert(qaDocuments).values({
      id: documentId,
      userId: input.userId,
      fileName: file.name,
      fileType,
      mimeType: file.type || 'application/octet-stream',
      fileSizeBytes: file.size,
      storageBucket: env.OBJECT_STORAGE_BUCKET,
      storageKey,
      status: 'pending',
      sourceChecksum: checksum,
      updatedAt: new Date(),
    })

    await db.insert(qaIngestionJobs).values({
      id: createId(),
      documentId,
      userId: input.userId,
      status: 'pending',
      updatedAt: new Date(),
    })

    const row = await db.query.qaDocuments.findFirst({
      where: (table, { eq }) => eq(table.id, documentId),
    })
    if (row) {
      created.push(toDocumentSummary(row))
    }
  }

  return created
}

async function processIngestionJob(jobId: string) {
  const job = await db.query.qaIngestionJobs.findFirst({
    where: (table, { eq }) => eq(table.id, jobId),
  })
  if (!job) return

  const document = await db.query.qaDocuments.findFirst({
    where: (table, { eq }) => eq(table.id, job.documentId),
  })

  if (!document) {
    await db
      .update(qaIngestionJobs)
      .set({
        status: 'failed',
        lastError: 'Document not found',
        updatedAt: new Date(),
      })
      .where(eq(qaIngestionJobs.id, job.id))
    return
  }

  const start = new Date()
  await db
    .update(qaIngestionJobs)
    .set({
      status: 'running',
      attempts: job.attempts + 1,
      lockedAt: start,
      startedAt: start,
      updatedAt: start,
    })
    .where(eq(qaIngestionJobs.id, job.id))

  await db
    .delete(qaDocumentChunks)
    .where(eq(qaDocumentChunks.documentId, document.id))

  try {
    const body = await readDocumentObject(document.storageKey)
    const text = await extractDocumentText({
      fileType: document.fileType as DocumentType,
      body,
    })
    const chunks = chunkText(text)
    const summary = await summarizeText(text)

    for (
      let batchStart = 0;
      batchStart < chunks.length;
      batchStart += EMBEDDING_BATCH_SIZE
    ) {
      const chunkBatch = chunks.slice(
        batchStart,
        batchStart + EMBEDDING_BATCH_SIZE,
      )
      const embeddings = await createEmbeddings(chunkBatch)

      for (const [offset, chunk] of chunkBatch.entries()) {
        const embedding = embeddings[offset]
        if (!embedding) {
          throw new Error(
            `OpenAI embedding request failed: missing embedding for chunk ${batchStart + offset + 1}.`,
          )
        }

        await db.insert(qaDocumentChunks).values({
          id: createId(),
          documentId: document.id,
          userId: document.userId,
          chunkIndex: batchStart + offset,
          content: chunk,
          tokenCount: Math.ceil(chunk.length / 4),
          pageNumber: null,
          embedding,
        })
      }
    }

    const finishedAt = new Date()
    await db
      .update(qaDocuments)
      .set({
        status: 'ready',
        summary,
        chunkCount: chunks.length,
        errorMessage: null,
        processedAt: finishedAt,
        updatedAt: finishedAt,
      })
      .where(eq(qaDocuments.id, document.id))

    await db
      .update(qaIngestionJobs)
      .set({
        status: 'completed',
        completedAt: finishedAt,
        lastError: null,
        updatedAt: finishedAt,
      })
      .where(eq(qaIngestionJobs.id, job.id))
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown ingestion failure'
    const failedAt = new Date()

    await db
      .update(qaDocuments)
      .set({
        status: 'failed',
        errorMessage: message,
        updatedAt: failedAt,
      })
      .where(eq(qaDocuments.id, document.id))

    await db
      .update(qaIngestionJobs)
      .set({
        status: 'failed',
        lastError: message,
        updatedAt: failedAt,
      })
      .where(eq(qaIngestionJobs.id, job.id))
  }
}

export async function processPendingIngestionJobs() {
  if (ingestionLoopRunning) return
  ingestionLoopRunning = true

  try {
    const jobs = await db.query.qaIngestionJobs.findMany({
      where: (table, { eq }) => eq(table.status, 'pending'),
      orderBy: (table, { asc }) => [asc(table.createdAt)],
      limit: 2,
    })

    for (const job of jobs) {
      await processIngestionJob(job.id)
    }
  } finally {
    ingestionLoopRunning = false
  }
}

export async function getDashboardOverview(
  userId: string,
): Promise<QaOverview> {
  const [documentStats] = await db
    .select({
      totalDocuments: count(qaDocuments.id),
      readyDocuments: sql<number>`count(*) filter (where ${qaDocuments.status} = 'ready')`,
    })
    .from(qaDocuments)
    .where(eq(qaDocuments.userId, userId))

  const recentRows = await db.query.qaDocuments.findMany({
    where: (table, { eq }) => eq(table.userId, userId),
    orderBy: (table, { desc }) => [desc(table.uploadedAt)],
    limit: 4,
  })

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [messageStats] = await db
    .select({
      queryCountThisWeek: count(qaMessages.id),
    })
    .from(qaMessages)
    .where(
      and(
        eq(qaMessages.userId, userId),
        eq(qaMessages.role, 'user'),
        gte(qaMessages.createdAt, oneWeekAgo),
      ),
    )

  return {
    totalDocuments: Number(documentStats?.totalDocuments ?? 0),
    readyDocuments: Number(documentStats?.readyDocuments ?? 0),
    queryCountThisWeek: Number(messageStats?.queryCountThisWeek ?? 0),
    activeModel:
      (await getSelectedModelIdForUser(userId)).split(':')[1] ??
      getDefaultModelEntry().model,
    recentDocuments: recentRows.map(toDocumentSummary),
  }
}

export async function listDocuments(input: {
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

  const rows = await db.query.qaDocuments.findMany({
    where: and(...filters),
    orderBy: (table, { desc }) => [desc(table.uploadedAt)],
  })

  return rows.map(toDocumentSummary)
}

export async function getDocumentById(input: {
  userId: string
  documentId: string
}) {
  const row = await db.query.qaDocuments.findFirst({
    where: and(
      eq(qaDocuments.id, input.documentId),
      eq(qaDocuments.userId, input.userId),
    ),
  })
  return row ? toDocumentDetail(row) : null
}

export async function deleteDocument(input: {
  userId: string
  documentId: string
}) {
  const document = await db.query.qaDocuments.findFirst({
    where: and(
      eq(qaDocuments.id, input.documentId),
      eq(qaDocuments.userId, input.userId),
    ),
  })

  if (!document) {
    return false
  }

  await db.delete(qaDocuments).where(eq(qaDocuments.id, document.id))
  await removeDocumentObject(document.storageKey)
  return true
}

export async function listConversations(
  userId: string,
): Promise<ConversationSummary[]> {
  const rows = await db.query.qaConversations.findMany({
    where: (table, { eq }) => eq(table.userId, userId),
    orderBy: (table, { desc }) => [desc(table.updatedAt)],
  })

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
  }))
}

export async function createConversation(input: {
  userId: string
  title?: string
}) {
  const conversationId = createId()
  const selectedModelId = await getSelectedModelIdForUser(input.userId)
  const [, model] = selectedModelId.split(':')
  const now = new Date()

  await db.insert(qaConversations).values({
    id: conversationId,
    userId: input.userId,
    title: input.title ?? 'New Chat',
    selectedModel: model,
    selectedScope: null,
    createdAt: now,
    updatedAt: now,
  })

  return {
    id: conversationId,
    title: input.title ?? 'New Chat',
    updatedAt: now.toISOString(),
  }
}

export async function getConversation(input: {
  userId: string
  conversationId: string
}): Promise<ConversationDetail | null> {
  const conversation = await db.query.qaConversations.findFirst({
    where: and(
      eq(qaConversations.id, input.conversationId),
      eq(qaConversations.userId, input.userId),
    ),
  })

  if (!conversation) return null

  const messages = await db.query.qaMessages.findMany({
    where: (table, { eq }) => eq(table.conversationId, conversation.id),
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  })

  return {
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString(),
    messages: messages.map(toChatMessage),
  }
}

async function retrieveChunks(input: {
  userId: string
  question: string
  documentIds?: string[]
}) {
  const embedding = await createEmbedding(input.question)
  const distance = cosineDistance(qaDocumentChunks.embedding, embedding)

  const baseCondition = and(
    eq(qaDocumentChunks.userId, input.userId),
    eq(qaDocuments.status, 'ready'),
    input.documentIds?.length
      ? inArray(qaDocumentChunks.documentId, input.documentIds)
      : undefined,
  )

  const rows = await db
    .select({
      content: qaDocumentChunks.content,
      pageNumber: qaDocumentChunks.pageNumber,
      fileName: qaDocuments.fileName,
      distance,
    })
    .from(qaDocumentChunks)
    .innerJoin(qaDocuments, eq(qaDocumentChunks.documentId, qaDocuments.id))
    .where(baseCondition)
    .orderBy(distance)
    .limit(TOP_K)

  return rows.map((row) => ({
    content: row.content,
    pageNumber: row.pageNumber,
    fileName: row.fileName,
    distance: Number(row.distance),
  }))
}

function dedupeSources(chunks: RetrievalChunk[]): SourceReference[] {
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

export async function sendMessage(input: {
  userId: string
  conversationId: string
  content: string
  scope: string
  responseLength: 'concise' | 'standard' | 'detailed'
}) {
  const conversation = await db.query.qaConversations.findFirst({
    where: and(
      eq(qaConversations.id, input.conversationId),
      eq(qaConversations.userId, input.userId),
    ),
  })

  if (!conversation) {
    throw new Error('Conversation not found')
  }

  const scopeDocumentIds = input.scope === 'all' ? undefined : [input.scope]
  const selectedModelId = await getSelectedModelIdForUser(input.userId)

  const userMessageId = createId()
  await db.insert(qaMessages).values({
    id: userMessageId,
    conversationId: conversation.id,
    userId: input.userId,
    role: 'user',
    content: input.content,
  })

  const startedAt = Date.now()
  const chunks = await retrieveChunks({
    userId: input.userId,
    question: input.content,
    documentIds: scopeDocumentIds,
  })
  const answer = await createAnswer({
    modelId: selectedModelId,
    question: input.content,
    responseLength: input.responseLength,
    chunks,
  })
  const sources = dedupeSources(chunks)
  const assistantMessageId = createId()
  const now = new Date()

  await db.insert(qaMessages).values({
    id: assistantMessageId,
    conversationId: conversation.id,
    userId: input.userId,
    role: 'assistant',
    content: answer.content,
    model: answer.model,
    responseTimeMs: Date.now() - startedAt,
    tokenCount: answer.tokenCount,
    sources,
  })

  await db
    .update(qaConversations)
    .set({
      title:
        conversation.title === 'New Chat'
          ? input.content.slice(0, 40)
          : conversation.title,
      selectedScope: input.scope === 'all' ? null : [input.scope],
      selectedModel: answer.model,
      updatedAt: now,
    })
    .where(eq(qaConversations.id, conversation.id))

  return getConversation({
    userId: input.userId,
    conversationId: conversation.id,
  })
}

export async function getUserModelSettings(
  userId: string,
): Promise<UserModelSettings> {
  const options = getConfiguredModelOptions()
  const selectedModelId = await getSelectedModelIdForUser(userId)
  return {
    options,
    selectedModelId,
  }
}

export async function updateUserModelSettings(input: {
  userId: string
  modelId: string
}) {
  const option = requireSupportedModel(input.modelId)
  const now = new Date()

  await db
    .insert(qaUserModelPreferences)
    .values({
      userId: input.userId,
      provider: option.provider,
      model: option.model,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: qaUserModelPreferences.userId,
      set: {
        provider: option.provider,
        model: option.model,
        updatedAt: now,
      },
    })

  return getUserModelSettings(input.userId)
}
