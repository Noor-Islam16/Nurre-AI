-- Rollback Script for Migrations 018 and 019
-- Description: Reverses the foreign key constraints and cleanup operations
-- Author: AI Assistant
-- Date: 2025-08-19
-- 
-- WARNING: This rollback cannot restore dropped functions/tables from migration 019
-- Always backup before running migrations to ensure full recovery is possible

-- ============================================
-- ROLLBACK MIGRATION 019 (Cleanup Orphaned)
-- ============================================
-- NOTE: Cannot restore dropped functions, triggers, tables, views, or types
-- These would need to be recreated from backup if needed

-- Log that rollback of 019 cannot fully restore dropped objects
DO $$
BEGIN
  RAISE WARNING 'Migration 019 rollback: Cannot restore dropped objects (functions, tables, triggers).';
  RAISE WARNING 'If these objects are needed, restore from backup.';
END $$;

-- ============================================
-- ROLLBACK MIGRATION 018 (Foreign Keys)
-- ============================================

-- Drop the foreign key constraints added in migration 018
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_parent_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;
ALTER TABLE focus_sessions DROP CONSTRAINT IF EXISTS focus_sessions_task_id_fkey;
ALTER TABLE focus_sessions DROP CONSTRAINT IF EXISTS focus_sessions_user_id_fkey;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_user_id_fkey;
ALTER TABLE mood_entries DROP CONSTRAINT IF EXISTS mood_entries_user_id_fkey;
ALTER TABLE preferences DROP CONSTRAINT IF EXISTS preferences_user_id_fkey;

-- Drop the indexes created for foreign keys
DROP INDEX IF EXISTS idx_tasks_parent_id;
DROP INDEX IF EXISTS idx_focus_sessions_task_id;
DROP INDEX IF EXISTS idx_focus_sessions_user_id;
DROP INDEX IF EXISTS idx_tasks_user_id;
DROP INDEX IF EXISTS idx_conversations_user_id;
DROP INDEX IF EXISTS idx_events_user_id;
DROP INDEX IF EXISTS idx_mood_entries_user_id;
DROP INDEX IF EXISTS idx_preferences_user_id;

-- ============================================
-- VERIFY ROLLBACK
-- ============================================
DO $$
DECLARE
  constraint_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Count remaining foreign key constraints
  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint
  WHERE contype = 'f'
  AND conname IN (
    'tasks_parent_id_fkey',
    'tasks_user_id_fkey',
    'focus_sessions_task_id_fkey',
    'focus_sessions_user_id_fkey',
    'conversations_user_id_fkey',
    'events_user_id_fkey',
    'mood_entries_user_id_fkey',
    'preferences_user_id_fkey'
  );
  
  IF constraint_count > 0 THEN
    RAISE WARNING 'Failed to remove % foreign key constraints', constraint_count;
  ELSE
    RAISE NOTICE 'All foreign key constraints successfully removed';
  END IF;
  
  -- Count remaining indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND indexname IN (
    'idx_tasks_parent_id',
    'idx_focus_sessions_task_id',
    'idx_focus_sessions_user_id',
    'idx_tasks_user_id',
    'idx_conversations_user_id',
    'idx_events_user_id',
    'idx_mood_entries_user_id',
    'idx_preferences_user_id'
  );
  
  IF index_count > 0 THEN
    RAISE WARNING 'Failed to remove % indexes', index_count;
  ELSE
    RAISE NOTICE 'All indexes successfully removed';
  END IF;
END $$;

-- ============================================
-- IMPORTANT NOTES
-- ============================================
-- 1. This rollback removes foreign key constraints which may allow orphaned records
-- 2. Dropped objects from migration 019 cannot be restored via this script
-- 3. Always test rollback procedures in a development environment first
-- 4. Consider using pg_dump for full backup before migrations
-- 5. Monitor application behavior after rollback for any issues

COMMENT ON SCHEMA public IS 'NureeAI schema - rollback applied, foreign keys removed';