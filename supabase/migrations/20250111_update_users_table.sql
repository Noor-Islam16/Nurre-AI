-- Migration: Update Users Table for DSM-5 Assessment
-- Status: COMPLETED
-- Task: 302
-- Date: 2025-01-11
-- Executed: 2025-01-11
-- Description: Add DSM-5 assessment columns to users table while maintaining backwards compatibility
-- Dependencies: Runs after 20250111_onboarding_v2_tables.sql (task-301)
-- Author: AI Assistant

-- ============================================
-- ADD NEW COLUMNS FOR DSM-5 ASSESSMENT
-- ============================================

-- Add new columns to users table for DSM-5 based assessment results
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS adhd_presentation TEXT CHECK (adhd_presentation IN ('combined', 'inattentive', 'hyperactive', 'borderline', 'negative')),
ADD COLUMN IF NOT EXISTS inatt_severity DECIMAL(5,2) CHECK (inatt_severity >= 0 AND inatt_severity <= 100),
ADD COLUMN IF NOT EXISTS hyper_severity DECIMAL(5,2) CHECK (hyper_severity >= 0 AND hyper_severity <= 100),
ADD COLUMN IF NOT EXISTS onboarding_version INTEGER DEFAULT 1; -- 1 for old, 2 for new

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for quick filtering by presentation type
CREATE INDEX IF NOT EXISTS idx_users_adhd_presentation ON users(adhd_presentation);
CREATE INDEX IF NOT EXISTS idx_users_onboarding_version ON users(onboarding_version);

-- ============================================
-- ADD DOCUMENTATION COMMENTS
-- ============================================

-- Add column comments for clarity
COMMENT ON COLUMN users.adhd_presentation IS 'DSM-5 based ADHD presentation type from 28-item assessment';
COMMENT ON COLUMN users.inatt_severity IS 'Inattention severity percentage (0-100) from assessment';
COMMENT ON COLUMN users.hyper_severity IS 'Hyperactivity/Impulsivity severity percentage (0-100) from assessment';
COMMENT ON COLUMN users.onboarding_version IS 'Version of onboarding completed: 1=old 5-question, 2=new 28-item';

-- ============================================
-- BACKWARDS COMPATIBILITY NOTE
-- ============================================
-- The adhd_persona column is intentionally kept for backwards compatibility
-- It will be removed in a future cleanup phase after all users are migrated
-- Task-315 will handle the data migration from persona to presentation

-- ============================================
-- VERIFY MIGRATION
-- ============================================

DO $$
BEGIN
  -- Check if new columns were added
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'adhd_presentation'
  ) THEN
    RAISE EXCEPTION 'Migration failed: Column adhd_presentation was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'inatt_severity'
  ) THEN
    RAISE EXCEPTION 'Migration failed: Column inatt_severity was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'hyper_severity'
  ) THEN
    RAISE EXCEPTION 'Migration failed: Column hyper_severity was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'onboarding_version'
  ) THEN
    RAISE EXCEPTION 'Migration failed: Column onboarding_version was not created';
  END IF;

  -- Check if indexes were created
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = 'idx_users_adhd_presentation'
  ) THEN
    RAISE EXCEPTION 'Migration failed: Index idx_users_adhd_presentation was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = 'idx_users_onboarding_version'
  ) THEN
    RAISE EXCEPTION 'Migration failed: Index idx_users_onboarding_version was not created';
  END IF;

  -- Verify adhd_persona column still exists (backwards compatibility)
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'adhd_persona'
  ) THEN
    RAISE WARNING 'Note: adhd_persona column not found - may have been removed already';
  END IF;
  
  RAISE NOTICE 'Migration successful: Users table updated with DSM-5 assessment columns';
END $$;