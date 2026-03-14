import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  vector,
} from 'drizzle-orm/pg-core'

import { user } from './auth'

export const qaDocumentStatus = pgEnum('qa_document_status', [
  'pending',
  'processing',
  'ready',
  'failed',
])

export const qaIngestionJobStatus = pgEnum('qa_ingestion_job_status', [
  'pending',
  'running',
  'completed',
  'failed',
])

export const qaDocuments = pgTable(
  'qa_documents',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    fileType: text('file_type').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSizeBytes: integer('file_size_bytes').notNull(),
    storageBucket: text('storage_bucket').notNull(),
    storageKey: text('storage_key').notNull(),
    status: qaDocumentStatus('status').notNull().default('pending'),
    summary: text('summary'),
    chunkCount: integer('chunk_count').notNull().default(0),
    sourceChecksum: text('source_checksum'),
    errorMessage: text('error_message'),
    uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
    processedAt: timestamp('processed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('qa_documents_storage_key_unique').on(
      table.storageBucket,
      table.storageKey,
    ),
    index('qa_documents_user_id_idx').on(table.userId),
    index('qa_documents_user_status_idx').on(table.userId, table.status),
    index('qa_documents_user_uploaded_at_idx').on(
      table.userId,
      table.uploadedAt,
    ),
  ],
)

export const qaDocumentChunks = pgTable(
  'qa_document_chunks',
  {
    id: text('id').primaryKey(),
    documentId: text('document_id')
      .notNull()
      .references(() => qaDocuments.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    tokenCount: integer('token_count'),
    pageNumber: integer('page_number'),
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('qa_document_chunks_document_chunk_unique').on(
      table.documentId,
      table.chunkIndex,
    ),
    index('qa_document_chunks_user_id_idx').on(table.userId),
    index('qa_document_chunks_document_id_idx').on(table.documentId),
    index('qa_document_chunks_embedding_cosine_idx')
      .using('ivfflat', table.embedding.op('vector_cosine_ops'))
      .with({ lists: '100' }),
  ],
)

export const qaIngestionJobs = pgTable(
  'qa_ingestion_jobs',
  {
    id: text('id').primaryKey(),
    documentId: text('document_id')
      .notNull()
      .references(() => qaDocuments.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: qaIngestionJobStatus('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    lockedAt: timestamp('locked_at'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    lastError: text('last_error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('qa_ingestion_jobs_document_unique').on(table.documentId),
    index('qa_ingestion_jobs_status_created_at_idx').on(
      table.status,
      table.createdAt,
    ),
    index('qa_ingestion_jobs_user_id_idx').on(table.userId),
  ],
)

export const qaConversations = pgTable(
  'qa_conversations',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    selectedScope: jsonb('selected_scope'),
    selectedModel: text('selected_model'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('qa_conversations_user_updated_at_idx').on(
      table.userId,
      table.updatedAt,
    ),
  ],
)

export const qaMessages = pgTable(
  'qa_messages',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => qaConversations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    model: text('model'),
    responseTimeMs: integer('response_time_ms'),
    tokenCount: integer('token_count'),
    sources: jsonb('sources').$type<{ name: string; page?: number }[] | null>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('qa_messages_conversation_created_at_idx').on(
      table.conversationId,
      table.createdAt,
    ),
    index('qa_messages_user_id_idx').on(table.userId),
  ],
)

export const qaUserModelPreferences = pgTable(
  'qa_user_model_preferences',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('qa_user_model_preferences_provider_model_idx').on(
      table.provider,
      table.model,
    ),
  ],
)
