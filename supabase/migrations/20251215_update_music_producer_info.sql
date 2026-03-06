-- Migration: 20251215_update_music_producer_info.sql
-- Purpose: Populate producer_name and producer_url for existing tracks
-- Based on feedback: Attribute tracks to their creators with hyperlinks
-- COMPLETED: 2025-12-15 - Run successfully on production

-- Northern Loop Collection - Ambrose Field & Paul Fretwell
-- Label: Sargasso Records
UPDATE public.music_tracks
SET
  producer_name = 'Ambrose Field & Paul Fretwell',
  producer_url = NULL  -- LinkedIn URLs to be added later
WHERE url LIKE '%NorthernLoop%';

-- Sound Healing Collection - Misha, Energy Coach
UPDATE public.music_tracks
SET
  producer_name = 'Misha, Energy Coach',
  producer_url = 'https://mishaenergycoach.com/'
WHERE url LIKE '%Nuree%';

-- Original Binaural Beats tracks - Nurbanu Somani
-- These are all other tracks not matching the above patterns
UPDATE public.music_tracks
SET
  producer_name = 'Nurbanu Somani',
  producer_url = NULL  -- LinkedIn URL to be added later
WHERE url NOT LIKE '%NorthernLoop%'
  AND url NOT LIKE '%Nuree%'
  AND producer_name IS NULL;

-- Verification
DO $$
DECLARE
  total_with_producer INTEGER;
  northern_loop_count INTEGER;
  sound_healing_count INTEGER;
  binaural_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_with_producer FROM public.music_tracks WHERE producer_name IS NOT NULL;
  SELECT COUNT(*) INTO northern_loop_count FROM public.music_tracks WHERE producer_name = 'Ambrose Field & Paul Fretwell';
  SELECT COUNT(*) INTO sound_healing_count FROM public.music_tracks WHERE producer_name = 'Misha, Energy Coach';
  SELECT COUNT(*) INTO binaural_count FROM public.music_tracks WHERE producer_name = 'Nurbanu Somani';

  RAISE NOTICE 'Producer info updated: % total tracks with producer credits', total_with_producer;
  RAISE NOTICE '- Northern Loop (Ambrose Field & Paul Fretwell): % tracks', northern_loop_count;
  RAISE NOTICE '- Sound Healing (Misha, Energy Coach): % tracks', sound_healing_count;
  RAISE NOTICE '- Binaural Beats (Nurbanu Somani): % tracks', binaural_count;
END $$;
