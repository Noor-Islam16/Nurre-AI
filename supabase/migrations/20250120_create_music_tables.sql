-- Migration: 20250120_create_music_tables.sql
-- Purpose: Create music_tracks and coach_recommendations with RLS and indexes.
-- Status: COMPLETED
-- Executed: 2025-01-20
-- Author: AI Assistant
-- Date: 2025-01-20

-- music_tracks
CREATE TABLE music_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('focus','calm','reset')),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "music_tracks_visible"
  ON music_tracks FOR SELECT
  USING (is_active = TRUE);

-- active-by-category index
CREATE INDEX IF NOT EXISTS music_tracks_active_category_idx ON music_tracks(category) WHERE is_active = TRUE;

-- coach_recommendations
CREATE TABLE coach_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id),
  user_id UUID NOT NULL REFERENCES users(id),
  track_id UUID NOT NULL REFERENCES music_tracks(id),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE coach_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_recs_manage"
  ON coach_recommendations FOR ALL
  USING (
    coach_id = auth.uid() AND EXISTS (
      SELECT 1 FROM coach_clients cc WHERE cc.coach_id = auth.uid() AND cc.user_id = coach_recommendations.user_id
    )
  )
  WITH CHECK (
    coach_id = auth.uid() AND EXISTS (
      SELECT 1 FROM coach_clients cc WHERE cc.coach_id = auth.uid() AND cc.user_id = coach_recommendations.user_id
    )
  );

-- Optional: prevent duplicates per coach/user/track
CREATE UNIQUE INDEX IF NOT EXISTS uq_coach_recs_c_u_t ON coach_recommendations(coach_id, user_id, track_id);

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'music_tracks'
  ) THEN
    RAISE EXCEPTION 'Migration failed: music_tracks missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coach_recommendations'
  ) THEN
    RAISE EXCEPTION 'Migration failed: coach_recommendations missing';
  END IF;
  RAISE NOTICE 'Migration ok: music tables created with RLS and indexes.';
END $$;
