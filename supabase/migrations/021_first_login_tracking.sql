-- Migration: Add First Login Tracking After Onboarding
-- Status: COMPLETED
-- Executed: 2025-08-19
-- Description: Adds column to track first login after onboarding completion
-- Author: AI Assistant
-- Date: 2025-08-19

-- ============================================
-- ADD FIRST LOGIN TRACKING COLUMN
-- ============================================

-- Add column to track first login after onboarding
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_login_after_onboarding BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN users.first_login_after_onboarding IS 'Tracks if user has logged in for the first time after completing onboarding. Used to show welcome message and mood check.';

-- ============================================
-- UPDATE EXISTING DATA
-- ============================================

-- For existing users who have completed onboarding, set to false
-- This ensures they won't see the first-time welcome message
UPDATE users 
SET first_login_after_onboarding = false 
WHERE onboarding_completed = true;

-- For users who haven't completed onboarding yet, it will be null/false
-- which is the desired behavior

-- ============================================
-- CREATE INDEX FOR PERFORMANCE
-- ============================================

-- Create index for quick lookups of users needing welcome message
CREATE INDEX IF NOT EXISTS idx_users_first_login 
ON users (id, first_login_after_onboarding) 
WHERE first_login_after_onboarding = true;

-- ============================================
-- VERIFY MIGRATION
-- ============================================

DO $$
BEGIN
  -- Check if column was added successfully
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'first_login_after_onboarding'
  ) THEN
    RAISE EXCEPTION 'Migration failed: Column first_login_after_onboarding was not added to users table';
  END IF;
  
  RAISE NOTICE 'Migration successful: First login tracking column added to users table';
END $$;