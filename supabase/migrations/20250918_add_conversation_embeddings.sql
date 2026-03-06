-- Migration: Add pgvector embedding support for conversations
-- Execution: run manually in Supabase Dashboard → SQL Editor before deploying embedding features
-- Notes:
--   1. MVP allows truncating all historical chat/transcript data; this script clears the table first.
--   2. Ensure pgvector extension is already enabled (Task 134).
--   3. After running, confirm new columns and index exist before enabling embedding jobs.
-- Status: COMPLETED
-- Applied: 2025-09-18

BEGIN;

-- Remove legacy conversation data (MVP scope only)
TRUNCATE TABLE conversations;

-- Add embedding columns
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_model text;

-- Create IVFFlat index for cosine similarity (requires ANALYZE after populating embeddings)
CREATE INDEX IF NOT EXISTS idx_conversations_embedding
  ON conversations
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

COMMIT;
