-- Migration: 20251023_create_breathing_sessions_table.sql
-- Purpose: Create breathing_sessions table for tracking calm page breathing exercises
-- Status: COMPLETED
-- Executed: 2025-10-23
-- Created: 2025-10-23
-- Author: AI Assistant
-- Date: 2025-10-23

-- breathing_sessions table
CREATE TABLE breathing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern_id TEXT NOT NULL CHECK (pattern_id IN ('478', 'box', '444', 'resonance')),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  cycles_completed INTEGER NOT NULL CHECK (cycles_completed > 0),
  stress_level_before INTEGER CHECK (stress_level_before >= 1 AND stress_level_before <= 10),
  stress_level_after INTEGER CHECK (stress_level_after >= 1 AND stress_level_after <= 10),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security
ALTER TABLE breathing_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view and manage their own breathing sessions
CREATE POLICY "breathing_sessions_own"
  ON breathing_sessions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index for efficient user queries
CREATE INDEX IF NOT EXISTS breathing_sessions_user_id_idx ON breathing_sessions(user_id, completed_at DESC);

-- Index for pattern analytics
CREATE INDEX IF NOT EXISTS breathing_sessions_pattern_idx ON breathing_sessions(pattern_id);

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'breathing_sessions'
  ) THEN
    RAISE EXCEPTION 'Migration failed: breathing_sessions table missing';
  END IF;
  RAISE NOTICE 'Migration ok: breathing_sessions table created with RLS and indexes.';
END $$;
