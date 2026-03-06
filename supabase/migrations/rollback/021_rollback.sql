-- Rollback Migration: Remove First Login Tracking
-- Description: Removes the first_login_after_onboarding column from users table
-- Author: AI Assistant
-- Date: 2025-08-19

-- ============================================
-- DROP INDEX
-- ============================================

DROP INDEX IF EXISTS idx_users_first_login;

-- ============================================
-- REMOVE COLUMN
-- ============================================

ALTER TABLE users 
DROP COLUMN IF EXISTS first_login_after_onboarding;

-- ============================================
-- VERIFY ROLLBACK
-- ============================================

DO $$
BEGIN
  -- Check if column was removed successfully
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'first_login_after_onboarding'
  ) THEN
    RAISE WARNING 'Rollback may have failed: Column first_login_after_onboarding still exists in users table';
  ELSE
    RAISE NOTICE 'Rollback successful: First login tracking column removed from users table';
  END IF;
END $$;