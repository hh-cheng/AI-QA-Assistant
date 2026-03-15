import { db } from '@Intelligent-QA-Assistant/db'
import {
  createDeepSeekChatProvider,
  createModelRegistry,
  createOpenAIChatProvider,
  createOpenAIEmbeddingProvider,
  createOpenAIService,
  runAnswerQuestionWorkflow,
  runDocumentIngestionWorkflow,
} from '@Intelligent-QA-Assistant/ai'
import {
  qaDocuments,
  qaIngestionJobs,
  qaMessages,
} from '@Intelligent-QA-Assistant/db/schema'
import { env } from '@Intelligent-QA-Assistant/env/server'
import { and, count, eq, gte, sql } from 'drizzle-orm'
import { createHash } from 'node:crypto'

import type {
  ChatMessage,
  ConversationDetail,
  ConversationSummary,
  DocumentDetail,
  DocumentSummary,
  DocumentType,
  QaOverview,
  UserModelSettings,
} from './qa'
import { getConfiguredModelOptions, getDefaultModelEntry } from './qa-models'
import { chunkRetriever, dedupeSources } from './qa/repositories/chunks'
import {
  conversationRepository,
  createConversationRow,
  getConversationMessages,
  getConversationRow,
  listConversationRows,
} from './qa/repositories/conversations'
import {
  deleteDocumentRow,
  documentRepository,
  getDocumentRowById,
  listDocumentRows,
} from './qa/repositories/documents'
import { ingestionJobRepository } from './qa/repositories/ingestion-jobs'
import {
  updateUserModelPreference,
  userModelPreferencesRepository,
} from './qa/repositories/model-preferences'
import {
  chunkingService,
  documentParser,
  parseDocumentType,
  summarizeText,
} from './qa/services/document-processing'
import { buildGroundedAnswerPrompt } from './qa/services/prompt-builder'
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

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

let ingestionLoopRunning = false

function isFakeAiEnabled() {
  return env.QA_TEST_MODE || env.QA_FAKE_AI
}

function isFakeStorageEnabled() {
  return env.QA_TEST_MODE || env.QA_FAKE_STORAGE
}

const openAIService = createOpenAIService({
  apiKey: env.OPENAI_API_KEY,
  embeddingModel: EMBEDDING_MODEL,
  embeddingDimensions: EMBEDDING_DIMENSIONS,
})
const embeddingProvider = createOpenAIEmbeddingProvider({
  service: openAIService,
})
const chatModelRegistry = createModelRegistry({
  providers: [
    createOpenAIChatProvider({
      service: openAIService,
    }),
    createDeepSeekChatProvider({
      apiKey: env.DEEPSEEK_API_KEY,
    }),
  ],
})

function createId() {
  return crypto.randomUUID()
}

function formatSizeLabel(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
}

function buildStorageKey(userId: string, documentId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `user/${userId}/documents/${documentId}/${safeName}`
}

function buildFakeAnswer(input: {
  content: string
  responseLength: 'concise' | 'standard' | 'detailed'
}) {
  const prefix =
    input.responseLength === 'concise'
      ? 'Concise test answer'
      : input.responseLength === 'detailed'
        ? 'Detailed test answer'
        : 'Standard test answer'

  return `${prefix}: ${input.content}`
}

function splitIntoChunks(content: string, chunkSize = 18) {
  const chunks: string[] = []

  for (let index = 0; index < content.length; index += chunkSize) {
    chunks.push(content.slice(index, index + chunkSize))
  }

  return chunks
}

async function appendFakeAssistantAnswer(input: {
  userId: string
  conversation: NonNullable<Awaited<ReturnType<typeof getConversationRow>>>
  content: string
  scope: string
  responseLength: 'concise' | 'standard' | 'detailed'
}) {
  const selectedModel = await getSelectedChatModel({ userId: input.userId })
  const modelName = selectedModel.model || getDefaultModelEntry().model
  const answer = buildFakeAnswer({
    content: input.content,
    responseLength: input.responseLength,
  })
  const now = new Date()

  await conversationRepository.appendUserMessage({
    conversationId: input.conversation.id,
    userId: input.userId,
    content: input.content,
  })

  await conversationRepository.appendAssistantMessage({
    conversationId: input.conversation.id,
    userId: input.userId,
    content: answer,
    model: modelName,
    responseTimeMs: 24,
    tokenCount: Math.max(1, Math.ceil(answer.length / 4)),
    sources: [],
  })

  await conversationRepository.updateConversationAfterAnswer({
    conversationId: input.conversation.id,
    title:
      input.conversation.title === 'New Chat'
        ? input.content.slice(0, 40)
        : input.conversation.title,
    selectedScope: input.scope === 'all' ? null : [input.scope],
    selectedModel: modelName,
    updatedAt: now,
  })

  return {
    answer,
    modelName,
  }
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

export type StreamMessageResult = {
  conversationId: string
  message: ChatMessage
}

async function getSelectedModelIdForUser(userId: string) {
  return userModelPreferencesRepository.getSelectedModelId(userId)
}

export async function getSelectedChatModel(input: { userId: string }) {
  const selectedModelId = await getSelectedModelIdForUser(input.userId)
  const [provider, model] = selectedModelId.split(':')
  const resolvedModel = chatModelRegistry.getModel(selectedModelId)

  return {
    selectedModelId,
    provider: provider ?? '',
    model: model ?? '',
    capabilities: resolvedModel?.capabilities ?? {
      streaming: false,
      embeddings: false,
    },
    status: resolvedModel?.status ?? 'not_configured',
  }
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
    const fakeStorage = isFakeStorageEnabled()

    if (!fakeStorage) {
      await storeDocumentObject({
        storageKey,
        body,
        contentType: file.type || 'application/octet-stream',
      })
    }

    await db.insert(qaDocuments).values({
      id: documentId,
      userId: input.userId,
      fileName: file.name,
      fileType,
      mimeType: file.type || 'application/octet-stream',
      fileSizeBytes: file.size,
      storageBucket: env.OBJECT_STORAGE_BUCKET,
      storageKey,
      status: fakeStorage ? 'ready' : 'pending',
      summary: fakeStorage ? summarizeText(body.toString('utf-8')) : null,
      chunkCount: fakeStorage ? 1 : 0,
      sourceChecksum: checksum,
      processedAt: fakeStorage ? new Date() : null,
      updatedAt: new Date(),
    })

    if (!fakeStorage) {
      await db.insert(qaIngestionJobs).values({
        id: createId(),
        documentId,
        userId: input.userId,
        status: 'pending',
        updatedAt: new Date(),
      })
    }

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
  const job = await ingestionJobRepository.getById({ jobId })
  if (!job) return

  await runDocumentIngestionWorkflow({
    input: {
      jobId: job.id,
      documentId: job.documentId,
      userId: job.userId,
    },
    deps: {
      documents: documentRepository,
      jobs: ingestionJobRepository,
      storage: {
        readObject: ({ storageKey }) => readDocumentObject(storageKey),
        storeObject: ({ storageKey, body, contentType }) =>
          storeDocumentObject({ storageKey, body, contentType }),
        removeObject: ({ storageKey }) => removeDocumentObject(storageKey),
      },
      parser: documentParser,
      chunker: chunkingService,
      embeddingProvider,
    },
  })
}

export async function processPendingIngestionJobs() {
  if (isFakeStorageEnabled()) return
  if (ingestionLoopRunning) return
  ingestionLoopRunning = true

  try {
    const jobs = await ingestionJobRepository.listPending(2)

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
  const rows = await listDocumentRows(input)
  return rows.map(toDocumentSummary)
}

export async function getDocumentById(input: {
  userId: string
  documentId: string
}) {
  const row = await getDocumentRowById(input)
  return row ? toDocumentDetail(row) : null
}

export async function deleteDocument(input: {
  userId: string
  documentId: string
}) {
  const document = await deleteDocumentRow(input)
  if (!document) {
    return false
  }

  if (!isFakeStorageEnabled()) {
    await removeDocumentObject(document.storageKey)
  }
  return true
}

export async function listConversations(
  userId: string,
): Promise<ConversationSummary[]> {
  const rows = await listConversationRows(userId)

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
  const selectedModelId = await getSelectedModelIdForUser(input.userId)
  const [, model] = selectedModelId.split(':')
  const now = new Date()

  return createConversationRow({
    userId: input.userId,
    title: input.title ?? 'New Chat',
    selectedModel: model ?? null,
    createdAt: now,
  })
}

export async function getConversation(input: {
  userId: string
  conversationId: string
}): Promise<ConversationDetail | null> {
  const conversation = await getConversationRow(input)

  if (!conversation) return null

  const messages = await getConversationMessages(conversation.id)

  return {
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString(),
    messages: messages.map(toChatMessage),
  }
}

export async function sendMessage(input: {
  userId: string
  conversationId: string
  content: string
  scope: string
  responseLength: 'concise' | 'standard' | 'detailed'
}) {
  const conversation = await getConversationRow({
    userId: input.userId,
    conversationId: input.conversationId,
  })

  if (!conversation) {
    throw new Error('Conversation not found')
  }

  if (isFakeAiEnabled()) {
    await appendFakeAssistantAnswer({
      userId: input.userId,
      conversation,
      content: input.content,
      scope: input.scope,
      responseLength: input.responseLength,
    })

    return getConversation({
      userId: input.userId,
      conversationId: conversation.id,
    })
  }

  await runAnswerQuestionWorkflow({
    input: {
      conversationId: conversation.id,
      userId: input.userId,
      question: input.content,
      scope: input.scope,
      responseLength: input.responseLength,
    },
    deps: {
      conversations: conversationRepository,
      chunkRetriever,
      modelPreferences: userModelPreferencesRepository,
      embeddingProvider,
      modelRegistry: chatModelRegistry,
      buildPrompt: buildGroundedAnswerPrompt,
      dedupeSources,
    },
  })

  return getConversation({
    userId: input.userId,
    conversationId: conversation.id,
  })
}

export async function streamMessage(input: {
  userId: string
  conversationId: string
  content: string
  scope: string
  responseLength: 'concise' | 'standard' | 'detailed'
  signal?: AbortSignal
  onStart?: (input: { conversationId: string }) => void
  onDelta(chunk: string): void
}): Promise<StreamMessageResult> {
  const conversation = await getConversationRow({
    userId: input.userId,
    conversationId: input.conversationId,
  })

  if (!conversation) {
    throw new Error('Conversation not found')
  }

  if (isFakeAiEnabled()) {
    input.onStart?.({
      conversationId: input.conversationId,
    })

    const { answer, modelName } = await appendFakeAssistantAnswer({
      userId: input.userId,
      conversation,
      content: input.content,
      scope: input.scope,
      responseLength: input.responseLength,
    })

    for (const chunk of splitIntoChunks(answer)) {
      if (input.signal?.aborted) {
        throw new Error('Streaming request aborted')
      }
      input.onDelta(chunk)
    }

    const updatedConversation = await getConversation({
      userId: input.userId,
      conversationId: input.conversationId,
    })
    const assistantMessage = updatedConversation?.messages.at(-1)

    if (!assistantMessage) {
      throw new Error('Test message generation failed')
    }

    return {
      conversationId: input.conversationId,
      message: {
        ...assistantMessage,
        model: modelName,
      },
    }
  }

  const selectedModel = await getSelectedChatModel({ userId: input.userId })

  if (!selectedModel.capabilities.streaming) {
    throw new Error('Streaming is not available for the selected model')
  }

  const resolvedModel = chatModelRegistry.requireModel(
    selectedModel.selectedModelId,
  )

  const startedAt = Date.now()

  await conversationRepository.appendUserMessage({
    conversationId: input.conversationId,
    userId: input.userId,
    content: input.content,
  })

  const [questionEmbedding] = await embeddingProvider.createEmbeddings({
    texts: [input.content],
  })

  if (!questionEmbedding) {
    throw new Error(
      'OpenAI embedding request failed: response did not contain an embedding.',
    )
  }

  const chunks = await chunkRetriever.retrieve({
    userId: input.userId,
    questionEmbedding,
    documentIds: input.scope === 'all' ? undefined : [input.scope],
  })

  const prompt = buildGroundedAnswerPrompt({
    question: input.content,
    responseLength: input.responseLength,
    chunks,
  })

  input.onStart?.({
    conversationId: input.conversationId,
  })

  if (!resolvedModel.chatProvider.streamGroundedAnswer) {
    throw new Error('Streaming is not available for the selected model')
  }

  const answer = await resolvedModel.chatProvider.streamGroundedAnswer({
    model: resolvedModel.model,
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
    signal: input.signal,
    onDelta: input.onDelta,
  })

  const sources = dedupeSources(chunks)
  const now = new Date()

  const assistantMessage = await conversationRepository.appendAssistantMessage({
    conversationId: input.conversationId,
    userId: input.userId,
    content: answer.content,
    model: answer.model,
    tokenCount: answer.tokenCount,
    responseTimeMs: Date.now() - startedAt,
    sources,
  })

  await conversationRepository.updateConversationAfterAnswer({
    conversationId: input.conversationId,
    title:
      conversation.title === 'New Chat'
        ? input.content.slice(0, 40)
        : conversation.title,
    selectedScope: input.scope === 'all' ? null : [input.scope],
    selectedModel: answer.model,
    updatedAt: now,
  })

  return {
    conversationId: input.conversationId,
    message: {
      id: assistantMessage.messageId,
      role: 'assistant',
      content: answer.content,
      model: answer.model,
      tokens: answer.tokenCount,
      responseTime: formatResponseTime(Date.now() - startedAt),
      sources,
    },
  }
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
  await updateUserModelPreference(input)
  return getUserModelSettings(input.userId)
}
