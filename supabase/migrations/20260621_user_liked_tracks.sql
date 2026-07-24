-- Migration: 20260621_user_liked_tracks.sql
-- Purpose: Add brain_modes column to music_tracks, create user_liked_tracks table, and default-tag existing tracks.

-- 1. Add brain_modes array column to music_tracks
ALTER TABLE public.music_tracks ADD COLUMN IF NOT EXISTS brain_modes TEXT[] DEFAULT '{}';

-- 2. Create user_liked_tracks table
CREATE TABLE IF NOT EXISTS public.user_liked_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.music_tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, track_id)
);

-- 3. Enable RLS on user_liked_tracks
ALTER TABLE public.user_liked_tracks ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for user_liked_tracks
CREATE POLICY "Users can select their own liked tracks"
  ON public.user_liked_tracks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own liked tracks"
  ON public.user_liked_tracks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own liked tracks"
  ON public.user_liked_tracks FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Seed default brain_modes tags for existing music tracks based on category
UPDATE public.music_tracks
SET brain_modes = ARRAY['Deep Focus', 'Ground']
WHERE category = 'focus';

UPDATE public.music_tracks
SET brain_modes = ARRAY['Reset', 'Ground']
WHERE category = 'calm';

UPDATE public.music_tracks
SET brain_modes = ARRAY['Flow', 'Start']
WHERE category = 'productivity';

UPDATE public.music_tracks
SET brain_modes = ARRAY['Reset']
WHERE category = 'sleep';
