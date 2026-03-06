-- Rollback: Remove conversation embedding columns/index
-- Execution: run manually in Supabase Dashboard → SQL Editor if migration 20250918_add_conversation_embeddings needs to be reverted.

BEGIN;

DROP INDEX IF EXISTS idx_conversations_embedding;

ALTER TABLE conversations
  DROP COLUMN IF EXISTS embedding,
  DROP COLUMN IF EXISTS embedding_model;

COMMIT;
