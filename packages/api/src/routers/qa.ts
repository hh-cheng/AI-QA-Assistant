import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import type {
  ChatMessage,
  ConversationDetail,
  DocumentDetail,
  DocumentSummary,
  DocumentType,
  ProviderItem,
  QaDefaults,
} from '../qa'
import { protectedProcedure, router } from '../index'

const documentStatusSchema = z.enum([
  'ready',
  'processing',
  'failed',
  'pending',
])
const documentTypeSchema = z.enum(['TXT', 'MD', 'PDF', 'DOCX'])

const providerConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  timeout: z.number().optional(),
  isDefault: z.boolean().optional(),
})

const defaultsSchema = z.object({
  defaultModel: z.string(),
  contextTurns: z.string(),
  showCitations: z.boolean(),
  defaultLength: z.enum(['concise', 'standard', 'detailed']),
  chunkStrategy: z.enum(['recursive', 'sentence', 'paragraph']),
  chunkSize: z.number().int().positive(),
  embeddingModel: z.string(),
  topK: z.number().int().positive(),
})

let documentCounter = 7
let conversationCounter = 3
let messageCounter = 7

let documents: DocumentDetail[] = [
  {
    id: '1',
    name: 'project-spec-v2.md',
    type: 'MD',
    sizeLabel: '24 KB',
    uploadedAt: '2026-03-12T08:20:00.000Z',
    status: 'ready',
    chunks: 12,
    summary:
      'Technical specification for Project Phoenix covering architecture, API design, and deployment strategy.',
  },
  {
    id: '2',
    name: 'meeting-notes-q3.txt',
    type: 'TXT',
    sizeLabel: '8 KB',
    uploadedAt: '2026-03-12T07:00:00.000Z',
    status: 'ready',
    chunks: 5,
    summary: 'Q3 planning meeting notes with action items and deadlines.',
  },
  {
    id: '3',
    name: 'api-design-draft.md',
    type: 'MD',
    sizeLabel: '42 KB',
    uploadedAt: '2026-03-11T16:40:00.000Z',
    status: 'processing',
    chunks: 0,
    summary: null,
  },
  {
    id: '4',
    name: 'research-findings.txt',
    type: 'TXT',
    sizeLabel: '15 KB',
    uploadedAt: '2026-03-10T12:30:00.000Z',
    status: 'ready',
    chunks: 8,
    summary: 'User research findings from 20 interviews with key insights.',
  },
  {
    id: '5',
    name: 'legacy-report.pdf',
    type: 'PDF',
    sizeLabel: '1.2 MB',
    uploadedAt: '2026-03-09T09:10:00.000Z',
    status: 'failed',
    chunks: null,
    summary: null,
  },
  {
    id: '6',
    name: 'onboarding-guide.md',
    type: 'MD',
    sizeLabel: '18 KB',
    uploadedAt: '2026-03-08T05:40:00.000Z',
    status: 'ready',
    chunks: 7,
    summary:
      'New employee onboarding guide covering tools, processes, and team structure.',
  },
]

let conversations: ConversationDetail[] = [
  {
    id: '1',
    title: 'Project Phoenix Architecture',
    updatedAt: '2026-03-12T08:28:00.000Z',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'What is the main architecture described in the project spec?',
      },
      {
        id: 'm2',
        role: 'assistant',
        content:
          'Based on project-spec-v2.md, the system uses a microservices architecture with API gateway, document service, embedding service, query engine, and LLM service.',
        model: 'GPT-4o',
        tokens: 452,
        responseTime: '1.2s',
        sources: [
          { name: 'project-spec-v2.md', page: 3 },
          { name: 'project-spec-v2.md', page: 7 },
        ],
      },
      {
        id: 'm3',
        role: 'user',
        content: 'What about the deployment strategy?',
      },
      {
        id: 'm4',
        role: 'assistant',
        content:
          'The current mock corpus describes a Kubernetes-based deployment using Helm charts, auto-scaling, and blue-green releases with Prometheus and Grafana.',
        model: 'GPT-4o',
        tokens: 198,
        responseTime: '0.8s',
        sources: [{ name: 'project-spec-v2.md', page: 12 }],
      },
    ],
  },
  {
    id: '2',
    title: 'Q3 Meeting Action Items',
    updatedAt: '2026-03-12T07:15:00.000Z',
    messages: [
      {
        id: 'm5',
        role: 'user',
        content: 'List all action items from the Q3 meeting notes',
      },
      {
        id: 'm6',
        role: 'assistant',
        content:
          'The mock notes contain five action items: finalize API design, set up CI/CD, conduct research interviews, draft a security checklist, and prepare the stakeholder demo.',
        model: 'GPT-4o',
        tokens: 156,
        responseTime: '0.6s',
        sources: [{ name: 'meeting-notes-q3.txt' }],
      },
    ],
  },
]

let providers: ProviderItem[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    desc: 'GPT-4o, GPT-4.1, and other hosted models',
    status: 'connected',
    config: {
      apiKey: 'sk-••••••••••••••••',
      baseUrl: '',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4096,
      timeout: 30,
      isDefault: true,
    },
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    desc: 'Claude family models via hosted API',
    status: 'not_configured',
    config: {
      apiKey: '',
      baseUrl: '',
      model: 'claude-3-5-sonnet',
      temperature: 0.7,
      maxTokens: 4096,
      timeout: 30,
      isDefault: false,
    },
  },
  {
    id: 'local',
    name: 'Local Model',
    desc: 'Self-hosted models via Ollama, vLLM, or custom endpoints',
    status: 'not_configured',
    config: {
      apiKey: '',
      baseUrl: 'http://localhost:11434',
      model: 'llama3',
      temperature: 0.7,
      maxTokens: 2048,
      timeout: 60,
      isDefault: false,
    },
  },
]

let defaultsState: QaDefaults = {
  defaultModel: 'gpt-4o',
  contextTurns: '10',
  showCitations: true,
  defaultLength: 'standard',
  chunkStrategy: 'recursive',
  chunkSize: 512,
  embeddingModel: 'text-embedding-3-small',
  topK: 5,
}

function sortDocuments(items: DocumentDetail[]) {
  return [...items].sort(
    (left, right) =>
      new Date(right.uploadedAt).getTime() -
      new Date(left.uploadedAt).getTime(),
  )
}

function sortConversations(items: ConversationDetail[]) {
  return [...items].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  )
}

function nextDocumentId() {
  documentCounter += 1
  return String(documentCounter)
}

function nextConversationId() {
  conversationCounter += 1
  return String(conversationCounter)
}

function nextMessageId() {
  messageCounter += 1
  return `m${messageCounter}`
}

function summarizeDocuments(items: DocumentDetail[]): DocumentSummary[] {
  return items.map(({ summary: _summary, ...rest }) => rest)
}

function createAssistantMessage(input: {
  content: string
  scope: string
  responseLength: 'concise' | 'standard' | 'detailed'
}): ChatMessage {
  const qualifier =
    input.responseLength === 'concise'
      ? 'Here is the short answer'
      : input.responseLength === 'detailed'
        ? 'Here is a more detailed mock answer'
        : 'Here is the mock answer'

  const scopeText =
    input.scope === 'all'
      ? 'across the indexed documents'
      : `within the selected scope "${input.scope}"`

  return {
    id: nextMessageId(),
    role: 'assistant',
    content: `${qualifier} ${scopeText}: "${input.content}". This response is served from the mock qa router and is structured so the UI behaves like a real document-grounded assistant.`,
    model: defaultsState.defaultModel,
    tokens: 132,
    responseTime: '0.7s',
    sources: [{ name: 'project-spec-v2.md', page: 5 }],
  }
}

function requireConversation(id: string) {
  const conversation = conversations.find((item) => item.id === id)
  if (!conversation) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Conversation ${id} not found`,
    })
  }
  return conversation
}

function requireDocument(id: string) {
  const document = documents.find((item) => item.id === id)
  if (!document) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Document ${id} not found`,
    })
  }
  return document
}

function getDocumentTypeFromName(name: string): DocumentType {
  const normalized = name.toLowerCase()
  if (normalized.endsWith('.md') || normalized.endsWith('.markdown'))
    return 'MD'
  if (normalized.endsWith('.pdf')) return 'PDF'
  if (normalized.endsWith('.docx')) return 'DOCX'
  return 'TXT'
}

function formatSizeLabel(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
}

export const qaRouter = router({
  dashboard: router({
    getOverview: protectedProcedure.query(() => {
      const sorted = sortDocuments(documents)
      return {
        totalDocuments: documents.length,
        readyDocuments: documents.filter((item) => item.status === 'ready')
          .length,
        queryCountThisWeek: 128,
        activeModel: defaultsState.defaultModel,
        recentDocuments: summarizeDocuments(sorted.slice(0, 4)),
      }
    }),
  }),
  documents: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            status: documentStatusSchema.or(z.literal('all')).optional(),
            type: documentTypeSchema.or(z.literal('all')).optional(),
          })
          .optional(),
      )
      .query(({ input }) => {
        const search = input?.search?.trim().toLowerCase()
        return summarizeDocuments(
          sortDocuments(documents).filter((item) => {
            if (search && !item.name.toLowerCase().includes(search))
              return false
            if (
              input?.status &&
              input.status !== 'all' &&
              item.status !== input.status
            )
              return false
            if (input?.type && input.type !== 'all' && item.type !== input.type)
              return false
            return true
          }),
        )
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(({ input }) => requireDocument(input.id)),
    upload: protectedProcedure
      .input(
        z.object({
          files: z.array(
            z.object({
              name: z.string().min(1),
              sizeBytes: z.number().int().nonnegative(),
            }),
          ),
        }),
      )
      .mutation(({ input }) => {
        const created = input.files.map((file) => {
          const document: DocumentDetail = {
            id: nextDocumentId(),
            name: file.name,
            type: getDocumentTypeFromName(file.name),
            sizeLabel: formatSizeLabel(file.sizeBytes),
            uploadedAt: new Date().toISOString(),
            status: 'processing',
            chunks: 0,
            summary: null,
          }
          documents = [document, ...documents]
          return document
        })
        return summarizeDocuments(created)
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ input }) => {
        requireDocument(input.id)
        documents = documents.filter((item) => item.id !== input.id)
        return { success: true }
      }),
  }),
  chat: router({
    listConversations: protectedProcedure.query(() =>
      sortConversations(conversations).map(
        ({ messages: _messages, ...rest }) => rest,
      ),
    ),
    getConversation: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(({ input }) => requireConversation(input.id)),
    createConversation: protectedProcedure
      .input(
        z
          .object({
            title: z.string().min(1).max(80).optional(),
          })
          .optional(),
      )
      .mutation(({ input }) => {
        const conversation: ConversationDetail = {
          id: nextConversationId(),
          title: input?.title ?? 'New Chat',
          updatedAt: new Date().toISOString(),
          messages: [],
        }
        conversations = [conversation, ...conversations]
        return conversation
      }),
    sendMessage: protectedProcedure
      .input(
        z.object({
          conversationId: z.string(),
          content: z.string().min(1),
          scope: z.string().default('all'),
          responseLength: z.enum(['concise', 'standard', 'detailed']),
        }),
      )
      .mutation(({ input }) => {
        const conversation = requireConversation(input.conversationId)
        const userMessage: ChatMessage = {
          id: nextMessageId(),
          role: 'user',
          content: input.content,
        }
        const assistantMessage = createAssistantMessage(input)
        conversation.messages = [
          ...conversation.messages,
          userMessage,
          assistantMessage,
        ]
        conversation.updatedAt = new Date().toISOString()
        if (conversation.title === 'New Chat') {
          conversation.title = input.content.slice(0, 40)
        }
        conversations = sortConversations(conversations)
        return conversation
      }),
  }),
  settings: router({
    getProviders: protectedProcedure.query(() => providers),
    updateProvider: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          config: providerConfigSchema,
          status: z
            .enum(['connected', 'not_configured', 'failed'])
            .default('connected'),
        }),
      )
      .mutation(({ input }) => {
        let updated: ProviderItem | null = null
        providers = providers.map((provider) => {
          if (provider.id !== input.id) {
            return provider
          }
          updated = {
            ...provider,
            status: input.status,
            config: {
              ...provider.config,
              ...input.config,
            },
          }
          return updated
        })
        if (!updated) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Provider ${input.id} not found`,
          })
        }
        return updated
      }),
    getDefaults: protectedProcedure.query(() => defaultsState),
    updateDefaults: protectedProcedure
      .input(defaultsSchema)
      .mutation(({ input }) => {
        defaultsState = input
        providers = providers.map((provider) => ({
          ...provider,
          config: {
            ...provider.config,
            isDefault: provider.config.model === input.defaultModel,
          },
        }))
        return defaultsState
      }),
  }),
})
