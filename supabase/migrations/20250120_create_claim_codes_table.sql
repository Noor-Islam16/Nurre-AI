-- Migration: 20250120_create_claim_codes_table.sql
-- Purpose: Create claim_codes with multi-use support (allowed_uses, uses_count, consumed_at) and indexes; enable RLS.
-- Status: COMPLETED
-- Executed: 2025-01-20
-- Author: AI Assistant
-- Date: 2025-01-20

CREATE TABLE claim_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by_coach_id UUID REFERENCES coaches(id),
  allowed_uses SMALLINT NOT NULL DEFAULT 3,
  uses_count INTEGER NOT NULL DEFAULT 0,
  consumed_at TIMESTAMP WITH TIME ZONE,
  invalidated_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE claim_codes ENABLE ROW LEVEL SECURITY;

-- Only owners can insert their own codes
CREATE POLICY "claim_codes_insert_owner"
  ON claim_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_claim_codes_hash ON claim_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_claim_codes_user ON claim_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_claim_codes_used_at ON claim_codes(used_at);
-- Active codes per user (multi-use aware): excludes invalidated/consumed
CREATE INDEX IF NOT EXISTS claim_codes_active_idx ON claim_codes(user_id) WHERE consumed_at IS NULL AND invalidated_at IS NULL;

-- Constraints
ALTER TABLE claim_codes
  ADD CONSTRAINT chk_claim_codes_expires_after_issue CHECK (expires_at > issued_at);

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'claim_codes'
  ) THEN
    RAISE EXCEPTION 'Migration failed: claim_codes table missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'claim_codes' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'Migration failed: RLS not enabled on claim_codes';
  END IF;

  RAISE NOTICE 'Migration ok: claim_codes created with RLS and indexes.';
END $$;
