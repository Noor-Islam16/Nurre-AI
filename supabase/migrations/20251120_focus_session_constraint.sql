-- Migration: Add constraint to prevent multiple active focus sessions per user
-- This ensures data integrity by enforcing single active session per user
-- COMPLETED: 2025-11-24 - Run successfully on production

-- First, clean up any existing duplicate active sessions
-- Keep only the most recent active session per user
UPDATE focus_sessions
SET ended_at = NOW(), completed = false
WHERE ended_at IS NULL
AND id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM focus_sessions
  WHERE ended_at IS NULL
  ORDER BY user_id, created_at DESC
);

-- Create unique partial index to prevent multiple active sessions
-- This index only covers rows where ended_at IS NULL (active sessions)
CREATE UNIQUE INDEX IF NOT EXISTS idx_focus_sessions_single_active
ON focus_sessions (user_id)
WHERE ended_at IS NULL;

-- Add comment for documentation
COMMENT ON INDEX idx_focus_sessions_single_active IS 'Ensures each user can only have one active focus session at a time';
