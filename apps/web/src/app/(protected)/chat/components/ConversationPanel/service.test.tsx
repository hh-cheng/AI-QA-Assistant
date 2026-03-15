import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import useConversationPanelService from './service'

const invalidateQueries = vi.fn()
const setQueryData = vi.fn()
const getConversationQueryOptions = vi.fn((input) => ({
  queryKey: ['conversation', input.id],
}))
const listDocumentsQueryOptions = vi.fn(() => ({ queryKey: ['documents'] }))
const getModelsQueryOptions = vi.fn(() => ({ queryKey: ['models'] }))
const sendMessageMutationOptions = vi.fn(() => ({ mutationKey: ['send'] }))
const useQuery = vi.fn()
const useMutation = vi.fn()
const toastError = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => useQuery(...args),
  useMutation: (...args: unknown[]) => useMutation(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
  },
}))

vi.mock('@/utils/trpc', () => ({
  queryClient: {
    invalidateQueries: (...args: unknown[]) => invalidateQueries(...args),
    setQueryData: (...args: unknown[]) => setQueryData(...args),
  },
  trpc: {
    qa: {
      chat: {
        getConversation: {
          queryOptions: (...args: unknown[]) =>
            getConversationQueryOptions(...args),
        },
        sendMessage: {
          mutationOptions: (...args: unknown[]) =>
            sendMessageMutationOptions(...args),
        },
      },
      documents: {
        list: {
          queryOptions: (...args: unknown[]) =>
            listDocumentsQueryOptions(...args),
        },
      },
      settings: {
        getModels: {
          queryOptions: (...args: unknown[]) => getModelsQueryOptions(...args),
        },
      },
    },
  },
}))

vi.mock('@Intelligent-QA-Assistant/env/web', () => ({
  env: {
    NEXT_PUBLIC_SERVER_URL: 'http://localhost:3000',
  },
}))

describe('useConversationPanelService', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useQuery.mockImplementation((input: { queryKey?: string[] }) => {
      if (input.queryKey?.[0] === 'conversation') {
        return {
          data: {
            id: 'conv-1',
            title: 'New Chat',
            updatedAt: new Date().toISOString(),
            messages: [],
          },
        }
      }

      if (input.queryKey?.[0] === 'documents') {
        return {
          data: [{ id: 'doc-1', name: 'Policy.pdf' }],
        }
      }

      return {
        data: {
          selectedModelId: 'openai:gpt-4.1',
          options: [
            {
              id: 'openai:gpt-4.1',
              provider: 'openai',
              model: 'gpt-4.1',
              label: 'OpenAI · gpt-4.1',
              status: 'connected',
              capabilities: {
                streaming: true,
                embeddings: true,
              },
            },
          ],
        },
      }
    })
  })

  it('falls back to the mutation API when streaming is unavailable', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      id: 'conv-1',
      title: 'New Chat',
      updatedAt: new Date().toISOString(),
      messages: [],
    })
    useMutation.mockReturnValue({
      mutateAsync,
      isPending: false,
    })

    const fetchMock = vi.fn().mockResolvedValue({
      status: 409,
      ok: false,
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useConversationPanelService('conv-1'))

    await act(async () => {
      await result.current.send('hello there')
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/qa/chat/stream',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    )
    expect(mutateAsync).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      content: 'hello there',
      scope: 'all',
      responseLength: 'standard',
    })
    expect(setQueryData).toHaveBeenCalled()
    expect(invalidateQueries).toHaveBeenCalled()
  })

  it('uses the mutation API directly when the selected model does not support streaming', async () => {
    useQuery.mockImplementation((input: { queryKey?: string[] }) => {
      if (input.queryKey?.[0] === 'conversation') {
        return {
          data: {
            id: 'conv-1',
            title: 'New Chat',
            updatedAt: new Date().toISOString(),
            messages: [],
          },
        }
      }

      if (input.queryKey?.[0] === 'documents') {
        return {
          data: [{ id: 'doc-1', name: 'Policy.pdf' }],
        }
      }

      return {
        data: {
          selectedModelId: 'deepseek:deepseek-chat',
          options: [
            {
              id: 'deepseek:deepseek-chat',
              provider: 'deepseek',
              model: 'deepseek-chat',
              label: 'DeepSeek · deepseek-chat',
              status: 'connected',
              capabilities: {
                streaming: false,
                embeddings: false,
              },
            },
          ],
        },
      }
    })

    const mutateAsync = vi.fn().mockResolvedValue({
      id: 'conv-1',
      title: 'New Chat',
      updatedAt: new Date().toISOString(),
      messages: [],
    })
    useMutation.mockReturnValue({
      mutateAsync,
      isPending: false,
    })

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useConversationPanelService('conv-1'))

    await act(async () => {
      await result.current.send('hello there')
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(mutateAsync).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      content: 'hello there',
      scope: 'all',
      responseLength: 'standard',
    })
  })
})
