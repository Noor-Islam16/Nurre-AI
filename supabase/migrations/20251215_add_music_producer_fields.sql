-- Migration: 20251215_add_music_producer_fields.sql
-- Purpose: Add producer credit fields to music_tracks for attribution
-- Fields: producer_name, producer_url for linking to LinkedIn/websites

DO $$
BEGIN
  -- Add producer_name column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='music_tracks' AND column_name='producer_name'
  ) THEN
    ALTER TABLE public.music_tracks ADD COLUMN producer_name TEXT;
    RAISE NOTICE 'Added producer_name column';
  END IF;

  -- Add producer_url column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='music_tracks' AND column_name='producer_url'
  ) THEN
    ALTER TABLE public.music_tracks ADD COLUMN producer_url TEXT;
    RAISE NOTICE 'Added producer_url column';
  END IF;

  RAISE NOTICE 'Migration complete: producer fields added to music_tracks';
END $$;
