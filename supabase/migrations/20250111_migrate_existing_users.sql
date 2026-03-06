-- Migration script for existing users from persona to presentation system
-- This should run AFTER the schema changes from task-301 and task-302
-- Date: 2025-01-11
-- Status: EXECUTED - 2025-09-17 23:05 UTC

-- Step 1: Update existing users with new presentation based on old persona
UPDATE users 
SET 
  adhd_presentation = CASE 
    WHEN adhd_persona = 'planner' THEN 'inattentive'
    WHEN adhd_persona = 'sprinter' THEN 'hyperactive'
    WHEN adhd_persona = 'multitasker' THEN 'combined'
    WHEN adhd_persona = 'motivation' THEN 'inattentive'
    WHEN adhd_persona = 'perfectionist' THEN 'inattentive'
    WHEN adhd_persona = 'balanced' THEN 'combined'
    ELSE 'borderline' -- Default for any unknown personas
  END,
  -- Set moderate severity as default for existing users
  inatt_severity = CASE
    WHEN adhd_persona IN ('planner', 'motivation', 'perfectionist') THEN 65
    WHEN adhd_persona IN ('multitasker', 'balanced') THEN 60
    WHEN adhd_persona = 'sprinter' THEN 40
    ELSE 50
  END,
  hyper_severity = CASE
    WHEN adhd_persona = 'sprinter' THEN 65
    WHEN adhd_persona IN ('multitasker', 'balanced') THEN 60
    WHEN adhd_persona IN ('planner', 'motivation', 'perfectionist') THEN 40
    ELSE 50
  END,
  -- Mark as version 1 (old system)
  onboarding_version = 1
WHERE 
  adhd_persona IS NOT NULL 
  AND adhd_presentation IS NULL; -- Only update if not already migrated

-- Step 2: Create placeholder results for existing users
INSERT INTO onboarding_results (
  user_id,
  inatt_endorsed,
  hyper_endorsed,
  total_endorsed,
  inatt_severity,
  hyper_severity,
  adhd_presentation,
  onset_childhood,
  impairment,
  top_signals,
  assessment_version,
  completed_at
)
SELECT 
  id as user_id,
  CASE 
    WHEN adhd_persona IN ('planner', 'motivation', 'perfectionist') THEN 4  -- Updated for 20Q: 4/6
    WHEN adhd_persona IN ('multitasker', 'balanced') THEN 4
    ELSE 2
  END as inatt_endorsed,
  CASE 
    WHEN adhd_persona = 'sprinter' THEN 4  -- Updated for 20Q: 4/6
    WHEN adhd_persona IN ('multitasker', 'balanced') THEN 4
    ELSE 2
  END as hyper_endorsed,
  CASE 
    WHEN adhd_persona IN ('multitasker', 'balanced') THEN 8  -- Updated for 20Q: 4+4
    WHEN adhd_persona IN ('planner', 'sprinter', 'motivation', 'perfectionist') THEN 4
    ELSE 4
  END as total_endorsed,
  CASE
    WHEN adhd_persona IN ('planner', 'motivation', 'perfectionist') THEN 65
    WHEN adhd_persona IN ('multitasker', 'balanced') THEN 60
    WHEN adhd_persona = 'sprinter' THEN 40
    ELSE 50
  END as inatt_severity,
  CASE
    WHEN adhd_persona = 'sprinter' THEN 65
    WHEN adhd_persona IN ('multitasker', 'balanced') THEN 60
    WHEN adhd_persona IN ('planner', 'motivation', 'perfectionist') THEN 40
    ELSE 50
  END as hyper_severity,
  CASE 
    WHEN adhd_persona = 'planner' THEN 'inattentive'
    WHEN adhd_persona = 'sprinter' THEN 'hyperactive'
    WHEN adhd_persona IN ('multitasker', 'balanced') THEN 'combined'
    WHEN adhd_persona = 'motivation' THEN 'inattentive'
    WHEN adhd_persona = 'perfectionist' THEN 'inattentive'
    ELSE 'borderline'
  END as adhd_presentation,
  true as onset_childhood, -- Assume true for existing users
  true as impairment, -- Assume true for existing users
  CASE
    WHEN adhd_persona = 'planner' THEN '["loses_things", "avoids_effort"]'::jsonb
    WHEN adhd_persona = 'sprinter' THEN '["restless", "driven_by_motor"]'::jsonb
    WHEN adhd_persona = 'multitasker' THEN '["loses_things", "restless"]'::jsonb
    WHEN adhd_persona = 'balanced' THEN '["daydream_reading", "restless"]'::jsonb
    WHEN adhd_persona = 'motivation' THEN '["avoids_effort", "daydream_reading"]'::jsonb
    WHEN adhd_persona = 'perfectionist' THEN '["careless_mistakes", "overreact_stress"]'::jsonb
    ELSE '[]'::jsonb
  END as top_signals,
  1 as assessment_version, -- Mark as old version
  COALESCE(created_at, NOW()) as completed_at
FROM users
WHERE 
  adhd_persona IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM onboarding_results 
    WHERE onboarding_results.user_id = users.id
  );

-- Step 3: Track migration in events table (using existing events table instead of system_logs)
INSERT INTO events (
  user_id,
  type,
  data,
  created_at
)
SELECT 
  id,
  'onboarding_migration_v1_to_v2',
  jsonb_build_object(
    'from_persona', adhd_persona,
    'to_presentation', adhd_presentation,
    'migration_date', NOW(),
    'assessment_version', 1
  ),
  NOW()
FROM users
WHERE 
  adhd_persona IS NOT NULL
  AND onboarding_version = 1
  AND NOT EXISTS (
    SELECT 1 FROM events 
    WHERE events.user_id = users.id 
    AND events.type = 'onboarding_migration_v1_to_v2'
  );

-- Step 4: Create index for faster queries on migrated users
CREATE INDEX IF NOT EXISTS idx_users_migration_status 
ON users(onboarding_version) 
WHERE onboarding_version = 1;

-- Step 5: Create index for presentation queries
CREATE INDEX IF NOT EXISTS idx_users_adhd_presentation 
ON users(adhd_presentation)
WHERE adhd_presentation IS NOT NULL;

-- Step 6: Add comment to document the migration
COMMENT ON COLUMN users.onboarding_version IS 'Version of onboarding assessment: 1=legacy persona system, 2=DSM-5 based system';
COMMENT ON COLUMN users.adhd_persona IS 'Legacy field from old 5-question system. Kept for backwards compatibility and rollback capability.';
COMMENT ON COLUMN users.adhd_presentation IS 'DSM-5 based ADHD presentation type from new 20-question assessment';

-- Output migration summary
DO $$
DECLARE
  migrated_count INTEGER;
  existing_results INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count 
  FROM users 
  WHERE onboarding_version = 1 AND adhd_presentation IS NOT NULL;
  
  SELECT COUNT(*) INTO existing_results
  FROM onboarding_results
  WHERE assessment_version = 1;
  
  RAISE NOTICE 'Migration completed: % users migrated, % placeholder results created', 
    migrated_count, existing_results;
END $$;