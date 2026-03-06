-- Migration: Add ai_preferences JSONB column to preferences table
-- This stores the full AI preference settings from the preference-store
-- COMPLETED: 2025-11-24 - Run successfully on production

-- Add ai_preferences column if it doesn't exist
ALTER TABLE preferences
ADD COLUMN IF NOT EXISTS ai_preferences JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN preferences.ai_preferences IS 'Stores AI assistant preferences including automation, interventions, tool permissions, and communication settings';

-- Create index for faster queries on ai_preferences
CREATE INDEX IF NOT EXISTS idx_preferences_ai_preferences
ON preferences USING gin (ai_preferences)
WHERE ai_preferences IS NOT NULL;
