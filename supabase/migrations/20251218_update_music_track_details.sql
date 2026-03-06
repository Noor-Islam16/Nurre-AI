-- Migration: 20251218_update_music_track_details.sql
-- Purpose: Add durations to Northern Loop tracks and update producer URLs
-- PENDING: Run this migration manually
-- COMPLETED: 2025-12-18 - Run successfully on production

-- Update Northern Loop track durations (in seconds)
UPDATE public.music_tracks SET duration_sec = 72 WHERE url LIKE '%NorthernLoop1_plantsandpistons%';
UPDATE public.music_tracks SET duration_sec = 59 WHERE url LIKE '%NorthernLoop2_pulsingresonance%';
UPDATE public.music_tracks SET duration_sec = 76 WHERE url LIKE '%NorthernLoop3_expectation%';
UPDATE public.music_tracks SET duration_sec = 90 WHERE url LIKE '%NorthernLoop4_renaissancepulse%';
UPDATE public.music_tracks SET duration_sec = 96 WHERE url LIKE '%NorthernLoop5_hope%';
UPDATE public.music_tracks SET duration_sec = 117 WHERE url LIKE '%NorthernLoop6_GlassLight%';

-- Update Nurbanu Somani's LinkedIn URL
UPDATE public.music_tracks
SET producer_url = 'https://www.linkedin.com/in/nurbanu-somani/'
WHERE producer_name = 'Nurbanu Somani';

-- Verification
DO $$
DECLARE
  northern_with_duration INTEGER;
  nurbanu_with_url INTEGER;
BEGIN
  SELECT COUNT(*) INTO northern_with_duration
  FROM public.music_tracks
  WHERE producer_name = 'Ambrose Field & Paul Fretwell' AND duration_sec IS NOT NULL;

  SELECT COUNT(*) INTO nurbanu_with_url
  FROM public.music_tracks
  WHERE producer_name = 'Nurbanu Somani' AND producer_url IS NOT NULL;

  RAISE NOTICE 'Northern Loop tracks with duration: %', northern_with_duration;
  RAISE NOTICE 'Nurbanu Somani tracks with URL: %', nurbanu_with_url;
END $$;
