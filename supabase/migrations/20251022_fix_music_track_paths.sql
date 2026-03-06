-- Migration: 20251022_fix_music_track_paths.sql
-- Purpose: Fix music_tracks URLs to use bucket-relative paths
-- Issue: URLs contain 'music/web/' prefix but should be 'web/' since .from('music') already specifies bucket
-- Status: COMPLETED
-- Date: 2025-10-22

-- Fix the path prefix: remove 'music/' from URLs that start with 'music/web/'
-- Before: music/web/1-laser-focus-beta-15-hz-crisp-piano-light-rain-background-for-study-sessions.opus
-- After:  web/1-laser-focus-beta-15-hz-crisp-piano-light-rain-background-for-study-sessions.opus

DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Update paths that incorrectly include the bucket name
  UPDATE public.music_tracks
  SET url = REPLACE(url, 'music/web/', 'web/')
  WHERE url LIKE 'music/web/%';

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  RAISE NOTICE 'Fixed % music track URL paths (removed music/ prefix)', affected_count;
END $$;
