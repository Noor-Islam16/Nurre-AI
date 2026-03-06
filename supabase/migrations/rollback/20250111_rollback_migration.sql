-- Rollback script for migration from persona to presentation system
-- This preserves the original persona data while removing new system data
-- Date: 2025-01-11

-- Step 1: Remove migrated data but keep original persona
UPDATE users 
SET 
  adhd_presentation = NULL,
  inatt_severity = NULL,
  hyper_severity = NULL,
  onboarding_version = NULL
WHERE 
  onboarding_version = 1
  AND adhd_persona IS NOT NULL;

-- Step 2: Remove placeholder results for migrated users
DELETE FROM onboarding_results
WHERE assessment_version = 1;

-- Step 3: Remove migration event logs
DELETE FROM events
WHERE type = 'onboarding_migration_v1_to_v2';

-- Step 4: Drop migration indexes
DROP INDEX IF EXISTS idx_users_migration_status;
DROP INDEX IF EXISTS idx_users_adhd_presentation;

-- Step 5: Remove comments added during migration
COMMENT ON COLUMN users.onboarding_version IS NULL;
COMMENT ON COLUMN users.adhd_persona IS NULL;
COMMENT ON COLUMN users.adhd_presentation IS NULL;

-- Output rollback summary
DO $$
DECLARE
  rolled_back_count INTEGER;
  deleted_results INTEGER;
  deleted_events INTEGER;
BEGIN
  SELECT COUNT(*) INTO rolled_back_count 
  FROM users 
  WHERE adhd_persona IS NOT NULL 
    AND adhd_presentation IS NULL
    AND onboarding_version IS NULL;
  
  SELECT COUNT(*) INTO deleted_results
  FROM onboarding_results
  WHERE assessment_version = 1;
  
  SELECT COUNT(*) INTO deleted_events
  FROM events
  WHERE type = 'onboarding_migration_v1_to_v2';
  
  RAISE NOTICE 'Rollback completed: % users rolled back, % results deleted, % events deleted', 
    rolled_back_count, deleted_results, deleted_events;
END $$;