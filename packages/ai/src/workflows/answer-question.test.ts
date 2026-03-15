import { describe, expect, it, vi } from 'vitest'

import { createModelRegistry } from '../registry'
import { runAnswerQuestionWorkflow } from './answer-question'

describe('runAnswerQuestionWorkflow', () => {
  it('routes answer generation through the selected provider while keeping embeddings on the embedding provider', async () => {
    const appendUserMessage = vi.fn().mockResolvedValue({
      messageId: 'user-msg-1',
    })
    const appendAssistantMessage = vi.fn().mockResolvedValue({
      messageId: 'assistant-msg-1',
    })
    const updateConversationAfterAnswer = vi.fn().mockResolvedValue(undefined)
    const createEmbeddings = vi.fn().mockResolvedValue([[0.12, 0.34]])
    const retrieve = vi.fn().mockResolvedValue([
      {
        documentId: 'doc-1',
        fileName: 'Handbook.pdf',
        content: 'Source chunk',
        pageNumber: 3,
        distance: 0.1,
      },
    ])
    const generateDeepSeekAnswer = vi.fn().mockResolvedValue({
      content: 'DeepSeek answer',
      tokenCount: 88,
      model: 'deepseek-chat',
    })
    const generateOpenAIAnswer = vi.fn().mockResolvedValue({
      content: 'OpenAI answer',
      tokenCount: 77,
      model: 'gpt-4.1',
    })

    const result = await runAnswerQuestionWorkflow({
      input: {
        conversationId: 'conv-1',
        userId: 'user-1',
        question: 'What does the policy say?',
        scope: 'all',
        responseLength: 'standard',
      },
      deps: {
        conversations: {
          getConversation: vi.fn().mockResolvedValue({
            id: 'conv-1',
            userId: 'user-1',
            title: 'New Chat',
          }),
          appendUserMessage,
          appendAssistantMessage,
          updateConversationAfterAnswer,
        },
        chunkRetriever: {
          retrieve,
        },
        modelPreferences: {
          getSelectedModelId: vi
            .fn()
            .mockResolvedValue('deepseek:deepseek-chat'),
        },
        embeddingProvider: {
          id: 'openai',
          createEmbeddings,
        },
        modelRegistry: createModelRegistry({
          providers: [
            {
              id: 'openai',
              capabilities: {
                streaming: true,
                embeddings: true,
              },
              isConfigured: () => true,
              generateGroundedAnswer: generateOpenAIAnswer,
              streamGroundedAnswer: vi.fn(),
            },
            {
              id: 'deepseek',
              capabilities: {
                streaming: true,
                embeddings: false,
              },
              isConfigured: () => true,
              generateGroundedAnswer: generateDeepSeekAnswer,
              streamGroundedAnswer: vi.fn(),
            },
          ],
        }),
        buildPrompt: vi.fn().mockReturnValue({
          systemPrompt: 'system prompt',
          userPrompt: 'user prompt',
        }),
        dedupeSources: vi.fn().mockReturnValue([
          {
            name: 'Handbook.pdf',
            page: 3,
          },
        ]),
      },
    })

    expect(createEmbeddings).toHaveBeenCalledWith({
      texts: ['What does the policy say?'],
    })
    expect(retrieve).toHaveBeenCalledWith({
      userId: 'user-1',
      questionEmbedding: [0.12, 0.34],
      documentIds: undefined,
    })
    expect(generateDeepSeekAnswer).toHaveBeenCalledWith({
      model: 'deepseek-chat',
      systemPrompt: 'system prompt',
      userPrompt: 'user prompt',
    })
    expect(generateOpenAIAnswer).not.toHaveBeenCalled()
    expect(appendUserMessage).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      userId: 'user-1',
      content: 'What does the policy say?',
    })
    expect(appendAssistantMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv-1',
        userId: 'user-1',
        content: 'DeepSeek answer',
        model: 'deepseek-chat',
        tokenCount: 88,
        sources: [{ name: 'Handbook.pdf', page: 3 }],
      }),
    )
    expect(updateConversationAfterAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv-1',
        selectedModel: 'deepseek-chat',
      }),
    )
    expect(result).toMatchObject({
      conversationId: 'conv-1',
      assistantMessageId: 'assistant-msg-1',
      content: 'DeepSeek answer',
      model: 'deepseek-chat',
      tokenCount: 88,
      sources: [{ name: 'Handbook.pdf', page: 3 }],
    })
  })
})
