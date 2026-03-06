-- Migration: 20251215_insert_new_music_tracks.sql
-- Purpose: Insert new music tracks from Paul Fretwell (Northern Loop) and Sound Healing collections
-- Note: Files already uploaded to Supabase Storage bucket 'music' in 'web/' folder
-- COMPLETED: 2025-12-15 - Run successfully on production

-- Northern Loop Collection (Ambient/Electronic - Focus category, no voice)
INSERT INTO public.music_tracks (title, url, category, has_voice, is_active) VALUES
  ('Plants and Pistons', 'web/NorthernLoop1_plantsandpistons.opus', 'focus', FALSE, TRUE),
  ('Pulsing Resonance', 'web/NorthernLoop2_pulsingresonance.opus', 'focus', FALSE, TRUE),
  ('Expectation', 'web/NorthernLoop3_expectation.opus', 'focus', FALSE, TRUE),
  ('Renaissance Pulse', 'web/NorthernLoop4_renaissancepulse.opus', 'focus', FALSE, TRUE),
  ('Hope', 'web/NorthernLoop5_hope.opus', 'focus', FALSE, TRUE),
  ('Glass Light', 'web/NorthernLoop6_GlassLight.opus', 'focus', FALSE, TRUE);

-- Sound Healing Collection - 5 Minute Tracks
INSERT INTO public.music_tracks (title, url, category, has_voice, duration_sec, is_active) VALUES
  ('Prep for a Task', 'web/Nuree5_1_prep for a task WVoice.mp3', 'productivity', TRUE, 300, TRUE),
  ('Focus', 'web/Nuree5_2_focus WVoice.mp3', 'focus', TRUE, 300, TRUE),
  ('Clear Mind', 'web/Nuree5_3_clear mind_SOnly.mp3', 'focus', FALSE, 300, TRUE),
  ('Calm', 'web/Nuree5_4_calm_SOnly.mp3', 'calm', FALSE, 300, TRUE),
  ('Activation Dopamine', 'web/Nuree5_5_activation dopamine_WVoice.mp3', 'productivity', TRUE, 300, TRUE);

-- Sound Healing Collection - 20 Minute Tracks
INSERT INTO public.music_tracks (title, url, category, has_voice, duration_sec, is_active) VALUES
  ('Calm (Extended)', 'web/Nuree20_6_calm_SOnly.mp3', 'calm', FALSE, 1200, TRUE),
  ('Sleep', 'web/Nuree20_7_sleep_Sonly.mp3', 'sleep', FALSE, 1200, TRUE),
  ('Emotional Reset', 'web/Nuree20_8_emotional reset_WVoice.mp3', 'calm', TRUE, 1200, TRUE),
  ('Sensory Harmony', 'web/Nuree20_9_sensory harmony_WVoice.mp3', 'calm', TRUE, 1200, TRUE),
  ('Energize', 'web/Nuree20_10_energize_WVoice .mp3', 'productivity', TRUE, 1200, TRUE);

-- Verification
DO $$
DECLARE
  track_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO track_count FROM public.music_tracks WHERE created_at > NOW() - INTERVAL '1 minute';
  IF track_count < 16 THEN
    RAISE WARNING 'Expected 16 new tracks, found %', track_count;
  ELSE
    RAISE NOTICE 'Successfully inserted % new music tracks', track_count;
  END IF;
END $$;
