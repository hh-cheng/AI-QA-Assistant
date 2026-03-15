import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import useSettingsPageService from './service'

const invalidateQueries = vi.fn()
const getModelsQueryOptions = vi.fn(() => ({ queryKey: ['models'] }))
const updateModelMutationOptions = vi.fn(() => ({
  mutationKey: ['update-model'],
}))
const useQuery = vi.fn()
const useMutation = vi.fn()
const toastSuccess = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => useQuery(...args),
  useMutation: (...args: unknown[]) => useMutation(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}))

vi.mock('@/utils/trpc', () => ({
  queryClient: {
    invalidateQueries: (...args: unknown[]) => invalidateQueries(...args),
  },
  trpc: {
    qa: {
      settings: {
        getModels: {
          queryOptions: (...args: unknown[]) => getModelsQueryOptions(...args),
        },
        updateModel: {
          mutationOptions: (...args: unknown[]) =>
            updateModelMutationOptions(...args),
        },
      },
    },
  },
}))

describe('useSettingsPageService', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useQuery.mockReturnValue({
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
    })
    useMutation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    })
  })

  it('hydrates selected model from the query result', async () => {
    const { result } = renderHook(() => useSettingsPageService())

    await waitFor(() => {
      expect(result.current.selectedModelId).toBe('openai:gpt-4.1')
    })
  })

  it('saves the selected model and invalidates queries', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    useMutation.mockReturnValue({
      mutateAsync,
      isPending: false,
    })

    const { result } = renderHook(() => useSettingsPageService())

    await waitFor(() => {
      expect(result.current.selectedModelId).toBe('openai:gpt-4.1')
    })

    act(() => {
      result.current.setSelectedModelId('deepseek:deepseek-chat')
    })

    await act(async () => {
      await result.current.saveModel()
    })

    expect(mutateAsync).toHaveBeenCalledWith({
      modelId: 'deepseek:deepseek-chat',
    })
    expect(toastSuccess).toHaveBeenCalledWith('Model preference updated')
    expect(invalidateQueries).toHaveBeenCalled()
  })
})
