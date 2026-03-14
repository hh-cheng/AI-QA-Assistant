import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import {
  createConversation,
  deleteDocument,
  getConversation,
  getDashboardOverview,
  getDocumentById,
  getUserModelSettings,
  listConversations,
  listDocuments,
  sendMessage,
  updateUserModelSettings,
} from '../qa-rag'
import { protectedProcedure, router } from '../index'

const documentStatusSchema = z.enum([
  'ready',
  'processing',
  'failed',
  'pending',
])

const documentTypeSchema = z.enum(['TXT', 'MD', 'PDF', 'DOCX'])

function requireUserId(session: { user?: { id?: string } } | null | undefined) {
  const userId = session?.user?.id
  if (!userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    })
  }
  return userId
}

export const qaRouter = router({
  dashboard: router({
    getOverview: protectedProcedure.query(({ ctx }) =>
      getDashboardOverview(requireUserId(ctx.session)),
    ),
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
      .query(({ ctx, input }) =>
        listDocuments({
          userId: requireUserId(ctx.session),
          search: input?.search?.trim() || undefined,
          status: input?.status,
          type: input?.type,
        }),
      ),
    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const document = await getDocumentById({
          userId: requireUserId(ctx.session),
          documentId: input.id,
        })

        if (!document) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Document ${input.id} not found`,
          })
        }

        return document
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const deleted = await deleteDocument({
          userId: requireUserId(ctx.session),
          documentId: input.id,
        })

        if (!deleted) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Document ${input.id} not found`,
          })
        }

        return { success: true }
      }),
  }),
  chat: router({
    listConversations: protectedProcedure.query(({ ctx }) =>
      listConversations(requireUserId(ctx.session)),
    ),
    getConversation: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const conversation = await getConversation({
          userId: requireUserId(ctx.session),
          conversationId: input.id,
        })

        if (!conversation) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Conversation ${input.id} not found`,
          })
        }

        return conversation
      }),
    createConversation: protectedProcedure
      .input(
        z
          .object({
            title: z.string().min(1).max(80).optional(),
          })
          .optional(),
      )
      .mutation(({ ctx, input }) =>
        createConversation({
          userId: requireUserId(ctx.session),
          title: input?.title,
        }),
      ),
    sendMessage: protectedProcedure
      .input(
        z.object({
          conversationId: z.string(),
          content: z.string().min(1),
          scope: z.string().default('all'),
          responseLength: z.enum(['concise', 'standard', 'detailed']),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const conversation = await sendMessage({
            userId: requireUserId(ctx.session),
            conversationId: input.conversationId,
            content: input.content,
            scope: input.scope,
            responseLength: input.responseLength,
          })

          if (!conversation) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: `Conversation ${input.conversationId} not found`,
            })
          }

          return conversation
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error
          }

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message:
              error instanceof Error
                ? error.message
                : 'Failed to generate a document-grounded answer',
          })
        }
      }),
  }),
  settings: router({
    getModels: protectedProcedure.query(({ ctx }) =>
      getUserModelSettings(requireUserId(ctx.session)),
    ),
    updateModel: protectedProcedure
      .input(
        z.object({
          modelId: z.string().min(1),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await updateUserModelSettings({
            userId: requireUserId(ctx.session),
            modelId: input.modelId,
          })
        } catch (error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              error instanceof Error ? error.message : 'Failed to update model',
          })
        }
      }),
  }),
})
