-- Migration: 20250120_create_coach_clients_and_notes.sql
-- Purpose: Create coach_clients link table and coach_notes (append-only) with strict RLS policies.
-- Status: COMPLETED
-- Executed: 2025-01-20
-- Author: AI Assistant
-- Date: 2025-01-20

-- coach_clients
CREATE TABLE coach_clients (
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  PRIMARY KEY (coach_id, user_id)
);

ALTER TABLE coach_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_reads_own_clients"
  ON coach_clients FOR SELECT
  USING (coach_id = auth.uid());

-- coach_notes (append-only)
CREATE TABLE coach_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id),
  user_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_notes_select"
  ON coach_notes FOR SELECT
  USING (
    coach_id = auth.uid() AND EXISTS (
      SELECT 1 FROM coach_clients cc WHERE cc.coach_id = auth.uid() AND cc.user_id = coach_notes.user_id
    )
  );

CREATE POLICY "coach_notes_insert"
  ON coach_notes FOR INSERT
  WITH CHECK (
    coach_id = auth.uid() AND EXISTS (
      SELECT 1 FROM coach_clients cc WHERE cc.coach_id = auth.uid() AND cc.user_id = coach_notes.user_id
    )
  );

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coach_clients'
  ) THEN
    RAISE EXCEPTION 'Migration failed: coach_clients missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coach_notes'
  ) THEN
    RAISE EXCEPTION 'Migration failed: coach_notes missing';
  END IF;
  RAISE NOTICE 'Migration ok: coach_clients and coach_notes created with RLS.';
END $$;
