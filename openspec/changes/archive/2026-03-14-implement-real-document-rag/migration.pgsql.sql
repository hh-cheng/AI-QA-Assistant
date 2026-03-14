CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'qa_document_status'
  ) THEN
    CREATE TYPE qa_document_status AS ENUM ('pending', 'processing', 'ready', 'failed');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'qa_ingestion_job_status'
  ) THEN
    CREATE TYPE qa_ingestion_job_status AS ENUM ('pending', 'running', 'completed', 'failed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS qa_documents (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes integer NOT NULL CHECK (file_size_bytes >= 0),
  storage_bucket text NOT NULL,
  storage_key text NOT NULL,
  status qa_document_status NOT NULL DEFAULT 'pending',
  summary text,
  chunk_count integer NOT NULL DEFAULT 0 CHECK (chunk_count >= 0),
  source_checksum text,
  error_message text,
  uploaded_at timestamp NOT NULL DEFAULT now(),
  processed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT qa_documents_storage_key_unique UNIQUE (storage_bucket, storage_key)
);

CREATE INDEX IF NOT EXISTS qa_documents_user_id_idx
  ON qa_documents (user_id);

CREATE INDEX IF NOT EXISTS qa_documents_user_status_idx
  ON qa_documents (user_id, status);

CREATE INDEX IF NOT EXISTS qa_documents_user_uploaded_at_idx
  ON qa_documents (user_id, uploaded_at DESC);

CREATE TABLE IF NOT EXISTS qa_document_chunks (
  id text PRIMARY KEY,
  document_id text NOT NULL REFERENCES qa_documents(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL CHECK (chunk_index >= 0),
  content text NOT NULL,
  token_count integer,
  page_number integer,
  embedding vector(1536) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT qa_document_chunks_document_chunk_unique UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS qa_document_chunks_user_id_idx
  ON qa_document_chunks (user_id);

CREATE INDEX IF NOT EXISTS qa_document_chunks_document_id_idx
  ON qa_document_chunks (document_id);

CREATE INDEX IF NOT EXISTS qa_document_chunks_embedding_cosine_idx
  ON qa_document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE TABLE IF NOT EXISTS qa_ingestion_jobs (
  id text PRIMARY KEY,
  document_id text NOT NULL REFERENCES qa_documents(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  status qa_ingestion_job_status NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  locked_at timestamp,
  started_at timestamp,
  completed_at timestamp,
  last_error text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT qa_ingestion_jobs_document_unique UNIQUE (document_id)
);

CREATE INDEX IF NOT EXISTS qa_ingestion_jobs_status_created_at_idx
  ON qa_ingestion_jobs (status, created_at);

CREATE INDEX IF NOT EXISTS qa_ingestion_jobs_user_id_idx
  ON qa_ingestion_jobs (user_id);

CREATE TABLE IF NOT EXISTS qa_conversations (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title text NOT NULL,
  selected_scope jsonb,
  selected_model text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qa_conversations_user_updated_at_idx
  ON qa_conversations (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS qa_messages (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES qa_conversations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  model text,
  response_time_ms integer,
  token_count integer,
  sources jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qa_messages_conversation_created_at_idx
  ON qa_messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS qa_messages_user_id_idx
  ON qa_messages (user_id);

CREATE TABLE IF NOT EXISTS qa_user_model_preferences (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  provider text NOT NULL,
  model text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qa_user_model_preferences_provider_model_idx
  ON qa_user_model_preferences (provider, model);
