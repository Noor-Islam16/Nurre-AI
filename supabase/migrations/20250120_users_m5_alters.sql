-- Migration: 20250120_users_m5_alters.sql
-- Purpose: Ensure M5 user columns and index exist (idempotent).
-- Status: COMPLETED
-- Executed: 2025-01-20
-- Author: AI Assistant
-- Date: 2025-01-20

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS has_booked_coaching BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_claim_code_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_booked ON users(has_booked_coaching) WHERE has_booked_coaching = TRUE;

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'has_booked_coaching'
  ) THEN
    RAISE EXCEPTION 'Migration failed: users.has_booked_coaching missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_claim_code_at'
  ) THEN
    RAISE EXCEPTION 'Migration failed: users.last_claim_code_at missing';
  END IF;
  RAISE NOTICE 'Migration ok: users alters present.';
END $$;
