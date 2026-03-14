import assert from 'node:assert/strict'

process.env.OBJECT_STORAGE_ENDPOINT ??= '127.0.0.1'
process.env.OBJECT_STORAGE_PORT ??= '9000'
process.env.OBJECT_STORAGE_ACCESS_KEY ??= 'minioadmin'
process.env.OBJECT_STORAGE_SECRET_KEY ??= 'minioadmin'
process.env.OBJECT_STORAGE_BUCKET ??= 'qa-documents'
process.env.OBJECT_STORAGE_USE_SSL ??= 'false'
process.env.OPENAI_API_KEY ??= 'test-openai-key'
process.env.ANTHROPIC_API_KEY ??= 'test-anthropic-key'
process.env.QA_DEFAULT_MODEL ??= 'openai:gpt-4.1'
process.env.QA_ALLOWED_MODELS ??=
  'openai:gpt-4.1,anthropic:claude-3-5-sonnet-latest'

const { db } = await import('../packages/db/src/index.ts')
const { qaConversations, qaDocuments } = await import(
  '../packages/db/src/schema.ts'
)
const { user } = await import('../packages/db/src/schema/auth.ts')
const {
  createConversation,
  deleteDocument,
  getDocumentById,
  getUserModelSettings,
  listDocuments,
  processPendingIngestionJobs,
  saveUploadedDocuments,
  sendMessage,
  updateUserModelSettings,
} = await import('../packages/api/src/qa-rag.ts')
const { ensureObjectStorageBucket } = await import(
  '../packages/api/src/qa-storage.ts'
)
const { eq } = await import(
  '../node_modules/.pnpm/node_modules/drizzle-orm/index.js'
)

const originalFetch = global.fetch
const embedding = Array.from({ length: 1536 }, (_value, index) =>
  index === 0 ? 1 : 0,
)

global.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.toString()

  if (url === 'https://api.openai.com/v1/embeddings') {
    return Response.json({
      data: [{ embedding }],
    })
  }

  if (url === 'https://api.openai.com/v1/chat/completions') {
    return Response.json({
      choices: [
        {
          message: {
            content: 'Validated OpenAI answer.',
          },
        },
      ],
      usage: {
        total_tokens: 42,
      },
    })
  }

  if (url === 'https://api.anthropic.com/v1/messages') {
    return Response.json({
      content: [
        {
          type: 'text',
          text: 'Validated Anthropic answer.',
        },
      ],
      usage: {
        input_tokens: 11,
        output_tokens: 17,
      },
    })
  }

  throw new Error(`Unexpected fetch request in validation script: ${url}`)
}

type MemoryFile = {
  name: string
  type: string
  size: number
  arrayBuffer: () => Promise<ArrayBuffer>
}

function createMemoryFile(
  name: string,
  type: string,
  content: string,
): MemoryFile {
  const body = Buffer.from(content, 'utf8')
  return {
    name,
    type,
    size: body.length,
    arrayBuffer: async () =>
      body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  }
}

const now = Date.now()
const userOneId = `rag-user-1-${now}`
const userTwoId = `rag-user-2-${now}`
const emailOne = `rag-user-1-${now}@example.com`
const emailTwo = `rag-user-2-${now}@example.com`

await ensureObjectStorageBucket()

await db.insert(user).values([
  {
    id: userOneId,
    name: 'RAG User One',
    email: emailOne,
    emailVerified: true,
  },
  {
    id: userTwoId,
    name: 'RAG User Two',
    email: emailTwo,
    emailVerified: true,
  },
])

try {
  const userOneUploads = await saveUploadedDocuments({
    userId: userOneId,
    files: [
      createMemoryFile(
        'notes.md',
        'text/markdown',
        '# Deployment\nThe release uses blue-green deployment with health checks.',
      ),
      createMemoryFile(
        'broken.pdf',
        'application/pdf',
        'not a real pdf payload',
      ),
    ],
  })

  const userTwoUploads = await saveUploadedDocuments({
    userId: userTwoId,
    files: [
      createMemoryFile(
        'private.txt',
        'text/plain',
        'This user has a private contract and renewal date.',
      ),
    ],
  })

  for (let index = 0; index < 4; index += 1) {
    await processPendingIngestionJobs()
  }

  const userOneDocuments = await listDocuments({ userId: userOneId })
  const userTwoDocuments = await listDocuments({ userId: userTwoId })

  assert.equal(
    userOneDocuments.length,
    2,
    'user one should see exactly two uploads',
  )
  assert.equal(
    userTwoDocuments.length,
    1,
    'user two should see exactly one upload',
  )

  const readyDocument = userOneDocuments.find(
    (document) => document.name === 'notes.md',
  )
  const failedDocument = userOneDocuments.find(
    (document) => document.name === 'broken.pdf',
  )
  const privateDocument = userTwoDocuments[0]

  assert.ok(readyDocument, 'ready document should exist')
  assert.equal(
    readyDocument.status,
    'ready',
    'markdown document should index successfully',
  )
  assert.ok(failedDocument, 'failed document should exist')
  assert.equal(
    failedDocument.status,
    'failed',
    'invalid pdf should fail ingestion',
  )
  assert.ok(privateDocument, 'user two document should exist')

  const crossUserAccess = await getDocumentById({
    userId: userOneId,
    documentId: privateDocument.id,
  })
  assert.equal(
    crossUserAccess,
    null,
    'user one must not read user two document',
  )

  const crossUserDelete = await deleteDocument({
    userId: userOneId,
    documentId: privateDocument.id,
  })
  assert.equal(
    crossUserDelete,
    false,
    'user one must not delete user two document',
  )

  await updateUserModelSettings({
    userId: userOneId,
    modelId: 'anthropic:claude-3-5-sonnet-latest',
  })

  const settings = await getUserModelSettings(userOneId)
  assert.equal(
    settings.selectedModelId,
    'anthropic:claude-3-5-sonnet-latest',
    'selected model should persist for the user',
  )

  const conversation = await createConversation({ userId: userOneId })
  const conversationResult = await sendMessage({
    userId: userOneId,
    conversationId: conversation.id,
    content: 'What deployment approach is described?',
    scope: 'all',
    responseLength: 'standard',
  })

  assert.ok(conversationResult, 'conversation result should be returned')
  assert.equal(
    conversationResult?.messages.at(-1)?.model,
    'claude-3-5-sonnet-latest',
    'assistant answer should use the selected model',
  )

  const citedSourceNames =
    conversationResult?.messages
      .at(-1)
      ?.sources?.map((source) => source.name) ?? []
  assert.ok(
    citedSourceNames.includes('notes.md'),
    'assistant response should cite the user-owned indexed document',
  )
  assert.ok(
    !citedSourceNames.includes('private.txt'),
    'assistant response must not cite another user document',
  )

  const failedDetail = await getDocumentById({
    userId: userOneId,
    documentId: failedDocument.id,
  })
  assert.ok(
    failedDetail?.errorMessage,
    'failed ingestion should expose an error message',
  )

  console.log(
    'Validation complete: user isolation, ingestion states, and model selection verified.',
  )
} finally {
  global.fetch = originalFetch
  await db.delete(user).where(eq(user.id, userOneId))
  await db.delete(user).where(eq(user.id, userTwoId))
  await db.delete(qaConversations).where(eq(qaConversations.userId, userOneId))
  await db.delete(qaDocuments).where(eq(qaDocuments.userId, userOneId))
  await db.delete(qaDocuments).where(eq(qaDocuments.userId, userTwoId))
}
