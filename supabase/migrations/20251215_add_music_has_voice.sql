-- Migration: 20251215_add_music_has_voice.sql
-- Purpose: Add has_voice column to music_tracks to distinguish guided tracks from sound-only
-- Changes:
--   1) Add has_voice BOOLEAN column (nullable, defaults to NULL for existing tracks)
-- COMPLETED: 2025-12-15 - Run successfully on production

DO $$
BEGIN
  -- Add has_voice column if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='music_tracks' AND column_name='has_voice'
  ) THEN
    ALTER TABLE public.music_tracks ADD COLUMN has_voice BOOLEAN DEFAULT NULL;
    RAISE NOTICE 'Added has_voice column to music_tracks';
  ELSE
    RAISE NOTICE 'has_voice column already exists';
  END IF;
END $$;
