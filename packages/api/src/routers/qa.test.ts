import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const qaRagMocks = vi.hoisted(() => ({
  createConversation: vi.fn(),
  deleteDocument: vi.fn(),
  getConversation: vi.fn(),
  getDashboardOverview: vi.fn(),
  getDocumentById: vi.fn(),
  getUserModelSettings: vi.fn(),
  listConversations: vi.fn(),
  listDocuments: vi.fn(),
  sendMessage: vi.fn(),
  updateUserModelSettings: vi.fn(),
}))

vi.mock('../qa-rag', () => qaRagMocks)

import { appRouter } from './index'

describe('qaRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects protected procedures without a session', async () => {
    const caller = appRouter.createCaller({ session: null } as never)

    await expect(
      caller.qa.documents.getById({
        id: 'doc-1',
      }),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    } satisfies Partial<TRPCError>)
  })

  it('returns NOT_FOUND when a document does not exist', async () => {
    qaRagMocks.getDocumentById.mockResolvedValue(null)
    const caller = appRouter.createCaller({
      session: { user: { id: 'user-1' } },
    } as never)

    await expect(
      caller.qa.documents.getById({
        id: 'doc-404',
      }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Document doc-404 not found',
    } satisfies Partial<TRPCError>)
  })

  it('returns NOT_FOUND when deleting a missing document', async () => {
    qaRagMocks.deleteDocument.mockResolvedValue(false)
    const caller = appRouter.createCaller({
      session: { user: { id: 'user-1' } },
    } as never)

    await expect(
      caller.qa.documents.delete({
        id: 'doc-404',
      }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Document doc-404 not found',
    } satisfies Partial<TRPCError>)
  })

  it('maps unexpected sendMessage failures to INTERNAL_SERVER_ERROR', async () => {
    qaRagMocks.sendMessage.mockRejectedValue(new Error('provider exploded'))
    const caller = appRouter.createCaller({
      session: { user: { id: 'user-1' } },
    } as never)

    await expect(
      caller.qa.chat.sendMessage({
        conversationId: 'conv-1',
        content: 'hello',
        scope: 'all',
        responseLength: 'standard',
      }),
    ).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'provider exploded',
    } satisfies Partial<TRPCError>)
  })
})
