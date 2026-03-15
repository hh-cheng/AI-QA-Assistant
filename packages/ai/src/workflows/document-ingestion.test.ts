import { describe, expect, it, vi } from 'vitest'

import { runDocumentIngestionWorkflow } from './document-ingestion'

describe('runDocumentIngestionWorkflow', () => {
  it('stores chunk embeddings through the dedicated embedding provider', async () => {
    const createEmbeddings = vi.fn().mockResolvedValue([
      [0.11, 0.22],
      [0.33, 0.44],
    ])
    const createChunks = vi.fn().mockResolvedValue(undefined)
    const markReady = vi.fn().mockResolvedValue(undefined)
    const markCompleted = vi.fn().mockResolvedValue(undefined)

    const result = await runDocumentIngestionWorkflow({
      input: {
        jobId: 'job-1',
        documentId: 'doc-1',
        userId: 'user-1',
      },
      deps: {
        documents: {
          getById: vi.fn().mockResolvedValue({
            id: 'doc-1',
            userId: 'user-1',
            storageKey: 'user/user-1/documents/doc-1/file.txt',
            fileType: 'TXT',
          }),
          markProcessing: vi.fn().mockResolvedValue(undefined),
          markReady,
          markFailed: vi.fn().mockResolvedValue(undefined),
          createChunks,
          deleteChunks: vi.fn().mockResolvedValue(undefined),
        },
        jobs: {
          listPending: vi.fn(),
          getById: vi.fn().mockResolvedValue({
            id: 'job-1',
            documentId: 'doc-1',
            userId: 'user-1',
            attempts: 0,
          }),
          markRunning: vi.fn().mockResolvedValue(undefined),
          markCompleted,
          markFailed: vi.fn().mockResolvedValue(undefined),
        },
        storage: {
          readObject: vi
            .fn()
            .mockResolvedValue(Buffer.from('Paragraph one.\n\nParagraph two.')),
          storeObject: vi.fn(),
          removeObject: vi.fn(),
        },
        parser: {
          extractText: vi.fn().mockResolvedValue({
            text: 'Paragraph one.\n\nParagraph two.',
          }),
        },
        chunker: {
          chunkText: vi.fn().mockResolvedValue([
            {
              index: 0,
              content: 'Paragraph one.',
              tokenEstimate: 3,
            },
            {
              index: 1,
              content: 'Paragraph two.',
              tokenEstimate: 3,
            },
          ]),
        },
        embeddingProvider: {
          id: 'openai',
          createEmbeddings,
        },
      },
    })

    expect(createEmbeddings).toHaveBeenCalledWith({
      texts: ['Paragraph one.', 'Paragraph two.'],
    })
    expect(createChunks).toHaveBeenCalledWith({
      documentId: 'doc-1',
      userId: 'user-1',
      chunks: [
        {
          chunkIndex: 0,
          content: 'Paragraph one.',
          tokenCount: 3,
          pageNumber: null,
          embedding: [0.11, 0.22],
        },
        {
          chunkIndex: 1,
          content: 'Paragraph two.',
          tokenCount: 3,
          pageNumber: null,
          embedding: [0.33, 0.44],
        },
      ],
    })
    expect(markReady).toHaveBeenCalled()
    expect(markCompleted).toHaveBeenCalledWith({
      jobId: 'job-1',
      at: expect.any(Date),
    })
    expect(result).toMatchObject({
      documentId: 'doc-1',
      chunkCount: 2,
      status: 'completed',
    })
  })
})
