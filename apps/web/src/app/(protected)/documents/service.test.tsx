import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import useDocumentsPageService from './service'

const invalidateQueries = vi.fn()
const setQueryData = vi.fn()
const listQueryOptions = vi.fn((...args: any[]) => ({ filters: args[0] }))
const deleteMutationOptions = vi.fn((..._: any[]) => ({
  mutationKey: ['delete-doc'],
}))
const useQuery = vi.fn()
const useMutation = vi.fn()
const toastSuccess = vi.fn()
const toastError = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => useQuery(...args),
  useMutation: (...args: unknown[]) => useMutation(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
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
      documents: {
        list: {
          queryOptions: (...args: any[]) => listQueryOptions(...args),
        },
        delete: {
          mutationOptions: (...args: any[]) => deleteMutationOptions(...args),
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

describe('useDocumentsPageService', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useQuery.mockReturnValue({
      data: [{ id: 'doc-1', name: 'notes.md' }],
    })
    useMutation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    })
  })

  it('uploads files and invalidates queries on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useDocumentsPageService())
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' })

    await act(async () => {
      await result.current.handleUpload([file])
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/qa/documents/upload',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    )
    expect(toastSuccess).toHaveBeenCalledWith('1 file(s) queued for indexing')
    expect(invalidateQueries).toHaveBeenCalled()
  })

  it('shows an error toast when upload fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Upload failed badly' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useDocumentsPageService())
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' })

    await act(async () => {
      await result.current.handleUpload([file])
    })

    expect(toastError).toHaveBeenCalledWith('Upload failed badly')
  })

  it('deletes the selected document and clears local selection', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    useMutation.mockReturnValue({
      mutateAsync,
      isPending: false,
    })

    const { result } = renderHook(() => useDocumentsPageService())

    act(() => {
      result.current.setSelectedId('doc-1')
      result.current.setDeleteId('doc-1')
    })

    await act(async () => {
      await result.current.handleDelete()
    })

    expect(mutateAsync).toHaveBeenCalledWith({ id: 'doc-1' })
    expect(result.current.selectedId).toBeNull()
    expect(result.current.deleteId).toBeNull()
    expect(toastSuccess).toHaveBeenCalledWith('Document deleted')
    expect(invalidateQueries).toHaveBeenCalled()
  })

  it('uses deferred filters for document queries', async () => {
    const { result } = renderHook(() => useDocumentsPageService())

    act(() => {
      result.current.setSearch('policy')
      result.current.setStatus('ready')
      result.current.setType('PDF')
    })

    await waitFor(() => {
      expect(listQueryOptions).toHaveBeenLastCalledWith({
        search: 'policy',
        status: 'ready',
        type: 'PDF',
      })
    })
  })
})
