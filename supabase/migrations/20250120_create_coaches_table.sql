-- Migration: 20250120_create_coaches_table.sql
-- Purpose: Create coaches table with specialties and scheduler link; enable RLS and self-view policy.
-- Status: COMPLETED
-- Executed: 2025-01-20
-- Author: AI Assistant
-- Date: 2025-01-20

CREATE TABLE coaches (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  scheduler_link TEXT,
  specialties TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_self_view"
  ON coaches FOR SELECT
  USING (auth.uid() = id);

-- Optional: index to support specialties filtering in user picker
CREATE INDEX IF NOT EXISTS coaches_specialties_gin ON coaches USING GIN (specialties);

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'coaches'
  ) THEN
    RAISE EXCEPTION 'Migration failed: coaches table missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'coaches' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'Migration failed: RLS not enabled on coaches';
  END IF;

  RAISE NOTICE 'Migration ok: coaches table created with RLS.';
END $$;
