import { createOpenAICompatibleClient } from '../openai/client'
import { describeProviderError } from '../openai/errors'
import type { ChatProvider } from '../providers'

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'

export function createDeepSeekChatProvider(input: {
  apiKey?: string
}): ChatProvider {
  return {
    id: 'deepseek',
    capabilities: {
      streaming: true,
      embeddings: false,
    },
    isConfigured() {
      return Boolean(input.apiKey)
    },
    async generateGroundedAnswer(request) {
      if (!input.apiKey) {
        throw new Error('DeepSeek API key is not configured')
      }

      try {
        const client = createOpenAICompatibleClient({
          apiKey: input.apiKey,
          baseURL: DEEPSEEK_BASE_URL,
        })
        const response = await client.chat.completions.create({
          model: request.model,
          messages: [
            {
              role: 'system',
              content: request.systemPrompt,
            },
            {
              role: 'user',
              content: request.userPrompt,
            },
          ],
        })

        const content = response.choices
          .map((choice) =>
            typeof choice.message.content === 'string'
              ? choice.message.content
              : '',
          )
          .join('\n')
          .trim()

        return {
          content: content || 'No answer returned.',
          tokenCount: response.usage?.total_tokens,
          model: response.model,
        }
      } catch (error) {
        throw new Error(
          describeProviderError({
            provider: 'DeepSeek',
            host: 'api.deepseek.com',
            operation: 'chat completion request',
            error,
          }),
        )
      }
    },
    async streamGroundedAnswer(request) {
      if (!input.apiKey) {
        throw new Error('DeepSeek API key is not configured')
      }

      try {
        const client = createOpenAICompatibleClient({
          apiKey: input.apiKey,
          baseURL: DEEPSEEK_BASE_URL,
        })
        const stream = await client.chat.completions.create({
          model: request.model,
          messages: [
            {
              role: 'system',
              content: request.systemPrompt,
            },
            {
              role: 'user',
              content: request.userPrompt,
            },
          ],
          stream: true,
        })

        let content = ''

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content
          if (!delta) {
            continue
          }

          content += delta
          request.onDelta(delta)
        }

        return {
          content: content || 'No answer returned.',
          model: request.model,
        }
      } catch (error) {
        throw new Error(
          describeProviderError({
            provider: 'DeepSeek',
            host: 'api.deepseek.com',
            operation: 'streaming chat completion request',
            error,
          }),
        )
      }
    },
  }
}
