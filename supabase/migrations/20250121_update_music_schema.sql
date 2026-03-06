-- Migration: 20250121_update_music_schema.sql
-- Purpose: Update music categories and add optional fields for Calm playlist
-- Changes:
--  1) Expand category CHECK from ('focus','calm','reset') to ('focus','calm','productivity','sleep')
--  2) Migrate existing rows: map 'reset' -> 'sleep'
--  3) Add optional columns for display/sorting: hz_label, duration_sec
-- Status: COMPLETED

DO $$
BEGIN
  -- 1) Update category CHECK constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage ccu
    JOIN information_schema.table_constraints tc
      ON tc.constraint_name = ccu.constraint_name
    WHERE ccu.table_schema = 'public'
      AND ccu.table_name = 'music_tracks'
      AND ccu.column_name = 'category'
      AND tc.constraint_type = 'CHECK'
  ) THEN
    BEGIN
      ALTER TABLE public.music_tracks DROP CONSTRAINT IF EXISTS music_tracks_category_check;
    EXCEPTION WHEN undefined_object THEN
      -- Some Postgres versions may auto-name the constraint differently; ignore
      NULL;
    END;
  END IF;

  -- 2) Migrate existing values if any
  UPDATE public.music_tracks SET category = 'sleep' WHERE category = 'reset';

  -- 3) Recreate CHECK with new set
  ALTER TABLE public.music_tracks
    ADD CONSTRAINT music_tracks_category_check
    CHECK (category IN ('focus','calm','productivity','sleep'));

  -- 4) Add optional columns if not present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='music_tracks' AND column_name='hz_label'
  ) THEN
    ALTER TABLE public.music_tracks ADD COLUMN hz_label TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='music_tracks' AND column_name='duration_sec'
  ) THEN
    ALTER TABLE public.music_tracks ADD COLUMN duration_sec INTEGER CHECK (duration_sec IS NULL OR duration_sec >= 0);
  END IF;

  RAISE NOTICE 'Music schema updated: categories expanded; optional fields added.';
END $$;

