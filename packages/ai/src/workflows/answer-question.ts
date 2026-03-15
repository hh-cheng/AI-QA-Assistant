import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'

import { getErrorMessage } from '../errors'
import type {
  AnswerQuestionInput,
  AnswerQuestionResult,
  ChunkRetriever,
  ConversationRepository,
  EmbeddingProvider,
  ModelRegistry,
  RetrievedChunk,
  UserModelPreferencesRepository,
} from '../index'

const inputSchema = z.object({
  conversationId: z.string(),
  userId: z.string(),
  question: z.string(),
  scope: z.string(),
  responseLength: z.enum(['concise', 'standard', 'detailed']),
})

const loadedSchema = inputSchema.extend({
  conversationTitle: z.string(),
  selectedModelId: z.string(),
  scopeDocumentIds: z.array(z.string()).optional(),
  startedAt: z.number().int().nonnegative(),
})

const retrievedSchema = loadedSchema.extend({
  chunks: z.array(
    z.object({
      documentId: z.string(),
      fileName: z.string(),
      content: z.string(),
      pageNumber: z.number().int().nullable().optional(),
      distance: z.number(),
    }),
  ),
})

const answeredSchema = retrievedSchema.extend({
  answerContent: z.string(),
  answerModel: z.string(),
  answerTokenCount: z.number().optional(),
})

const outputSchema = z.object({
  conversationId: z.string(),
  assistantMessageId: z.string(),
  content: z.string(),
  model: z.string().optional(),
  tokenCount: z.number().optional(),
  sources: z.array(
    z.object({
      name: z.string(),
      page: z.number().optional(),
    }),
  ),
})

type AnswerGenerationResult = {
  content: string
  tokenCount?: number
  model: string
}

export type AnswerQuestionWorkflowDeps = {
  conversations: ConversationRepository
  chunkRetriever: ChunkRetriever
  modelPreferences: UserModelPreferencesRepository
  embeddingProvider: EmbeddingProvider
  modelRegistry: ModelRegistry
  buildPrompt(input: {
    question: string
    responseLength: 'concise' | 'standard' | 'detailed'
    chunks: RetrievedChunk[]
  }): { systemPrompt: string; userPrompt: string }
  dedupeSources(
    chunks: RetrievedChunk[],
  ): Array<{ name: string; page?: number }>
}

export function createAnswerQuestionWorkflow(deps: AnswerQuestionWorkflowDeps) {
  const loadStep = createStep({
    id: 'load-conversation-context',
    inputSchema,
    outputSchema: loadedSchema,
    execute: async ({ inputData }) => {
      const conversation = await deps.conversations.getConversation({
        conversationId: inputData.conversationId,
        userId: inputData.userId,
      })

      if (!conversation) {
        throw new Error('Conversation not found')
      }

      const selectedModelId = await deps.modelPreferences.getSelectedModelId(
        inputData.userId,
      )

      return {
        ...inputData,
        conversationTitle: conversation.title,
        selectedModelId,
        scopeDocumentIds:
          inputData.scope === 'all' ? undefined : [inputData.scope],
        startedAt: Date.now(),
      }
    },
  })

  const retrieveStep = createStep({
    id: 'persist-user-message-and-retrieve',
    inputSchema: loadedSchema,
    outputSchema: retrievedSchema,
    execute: async ({ inputData }) => {
      await deps.conversations.appendUserMessage({
        conversationId: inputData.conversationId,
        userId: inputData.userId,
        content: inputData.question,
      })

      const [questionEmbedding] = await deps.embeddingProvider.createEmbeddings(
        {
          texts: [inputData.question],
        },
      )
      if (!questionEmbedding) {
        throw new Error(
          'OpenAI embedding request failed: response did not contain an embedding.',
        )
      }

      const chunks = await deps.chunkRetriever.retrieve({
        userId: inputData.userId,
        questionEmbedding,
        documentIds: inputData.scopeDocumentIds,
      })

      return {
        ...inputData,
        chunks: chunks.map((chunk) => ({
          ...chunk,
          pageNumber: chunk.pageNumber ?? null,
        })),
      }
    },
  })

  const answerStep = createStep({
    id: 'generate-grounded-answer',
    inputSchema: retrievedSchema,
    outputSchema: answeredSchema,
    execute: async ({ inputData }) => {
      const prompt = deps.buildPrompt({
        question: inputData.question,
        responseLength: inputData.responseLength,
        chunks: inputData.chunks,
      })
      const selectedModel = deps.modelRegistry.requireModel(
        inputData.selectedModelId,
      )

      const answer: AnswerGenerationResult =
        await selectedModel.chatProvider.generateGroundedAnswer({
          model: selectedModel.model,
          systemPrompt: prompt.systemPrompt,
          userPrompt: prompt.userPrompt,
        })

      return {
        ...inputData,
        answerContent: answer.content,
        answerModel: answer.model,
        answerTokenCount: answer.tokenCount,
      }
    },
  })

  const persistStep = createStep({
    id: 'persist-answer-and-update-conversation',
    inputSchema: answeredSchema,
    outputSchema,
    execute: async ({ inputData }) => {
      const sources = deps.dedupeSources(inputData.chunks)
      const now = new Date()
      const assistantMessage = await deps.conversations.appendAssistantMessage({
        conversationId: inputData.conversationId,
        userId: inputData.userId,
        content: inputData.answerContent,
        model: inputData.answerModel,
        tokenCount: inputData.answerTokenCount,
        responseTimeMs: Date.now() - inputData.startedAt,
        sources,
      })

      await deps.conversations.updateConversationAfterAnswer({
        conversationId: inputData.conversationId,
        title:
          inputData.conversationTitle === 'New Chat'
            ? inputData.question.slice(0, 40)
            : inputData.conversationTitle,
        selectedScope: inputData.scope === 'all' ? null : [inputData.scope],
        selectedModel: inputData.answerModel,
        updatedAt: now,
      })

      return {
        conversationId: inputData.conversationId,
        assistantMessageId: assistantMessage.messageId,
        content: inputData.answerContent,
        model: inputData.answerModel,
        tokenCount: inputData.answerTokenCount,
        sources,
      }
    },
  })

  return createWorkflow({
    id: 'answer-question-workflow',
    inputSchema,
    outputSchema,
  })
    .then(loadStep)
    .then(retrieveStep)
    .then(answerStep)
    .then(persistStep)
    .commit()
}

export async function runAnswerQuestionWorkflow(input: {
  input: AnswerQuestionInput
  deps: AnswerQuestionWorkflowDeps
}): Promise<AnswerQuestionResult> {
  const workflow = createAnswerQuestionWorkflow(input.deps)
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
    const message = getErrorMessage(
      error,
      'Failed to generate a grounded answer',
    )

    console.error('answer question workflow failed', {
      input: input.input,
      message,
      error,
    })

    throw new Error(message)
  }
}
