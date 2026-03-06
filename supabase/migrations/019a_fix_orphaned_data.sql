-- Migration: Fix Orphaned Data Before Adding Foreign Keys
-- Status: COMPLETED
-- Executed: 2025-08-19
-- Description: Removes orphaned records that reference non-existent users
-- Author: AI Assistant
-- Date: 2025-08-19
-- Run this BEFORE 019_add_foreign_keys.sql

-- ============================================
-- IDENTIFY ORPHANED RECORDS
-- ============================================

-- Check for orphaned tasks
DO $$
DECLARE
  orphaned_task_count INTEGER;
  orphaned_focus_count INTEGER;
  orphaned_event_count INTEGER;
  orphaned_conversation_count INTEGER;
  orphaned_mood_count INTEGER;
  orphaned_preference_count INTEGER;
BEGIN
  -- Count orphaned tasks
  SELECT COUNT(*) INTO orphaned_task_count
  FROM tasks t
  WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = t.user_id);
  
  IF orphaned_task_count > 0 THEN
    RAISE NOTICE 'Found % orphaned tasks', orphaned_task_count;
  END IF;

  -- Count orphaned focus sessions
  SELECT COUNT(*) INTO orphaned_focus_count
  FROM focus_sessions fs
  WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = fs.user_id);
  
  IF orphaned_focus_count > 0 THEN
    RAISE NOTICE 'Found % orphaned focus sessions', orphaned_focus_count;
  END IF;

  -- Count orphaned events
  SELECT COUNT(*) INTO orphaned_event_count
  FROM events e
  WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = e.user_id);
  
  IF orphaned_event_count > 0 THEN
    RAISE NOTICE 'Found % orphaned events', orphaned_event_count;
  END IF;

  -- Count orphaned conversations
  SELECT COUNT(*) INTO orphaned_conversation_count
  FROM conversations c
  WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = c.user_id);
  
  IF orphaned_conversation_count > 0 THEN
    RAISE NOTICE 'Found % orphaned conversations', orphaned_conversation_count;
  END IF;

  -- Count orphaned mood entries
  SELECT COUNT(*) INTO orphaned_mood_count
  FROM mood_entries m
  WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = m.user_id);
  
  IF orphaned_mood_count > 0 THEN
    RAISE NOTICE 'Found % orphaned mood entries', orphaned_mood_count;
  END IF;

  -- Count orphaned preferences
  SELECT COUNT(*) INTO orphaned_preference_count
  FROM preferences p
  WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.user_id);
  
  IF orphaned_preference_count > 0 THEN
    RAISE NOTICE 'Found % orphaned preferences', orphaned_preference_count;
  END IF;
END $$;

-- ============================================
-- DELETE ORPHANED RECORDS
-- ============================================

-- Delete orphaned tasks (this will cascade to subtasks via parent_id)
DELETE FROM tasks
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.id = tasks.user_id
);

-- Delete orphaned focus sessions
DELETE FROM focus_sessions
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.id = focus_sessions.user_id
);

-- Delete orphaned events
DELETE FROM events
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.id = events.user_id
);

-- Delete orphaned conversations
DELETE FROM conversations
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.id = conversations.user_id
);

-- Delete orphaned mood entries
DELETE FROM mood_entries
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.id = mood_entries.user_id
);

-- Delete orphaned preferences
DELETE FROM preferences
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.id = preferences.user_id
);

-- ============================================
-- FIX ORPHANED TASK REFERENCES IN FOCUS SESSIONS
-- ============================================

-- Set task_id to NULL where the task doesn't exist
UPDATE focus_sessions
SET task_id = NULL
WHERE task_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = focus_sessions.task_id
  );

-- ============================================
-- FIX ORPHANED PARENT REFERENCES IN TASKS
-- ============================================

-- Set parent_id to NULL where the parent task doesn't exist
UPDATE tasks
SET parent_id = NULL
WHERE parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = tasks.parent_id
  );

-- ============================================
-- VERIFY CLEANUP
-- ============================================

DO $$
DECLARE
  remaining_orphans INTEGER;
BEGIN
  -- Check if any orphans remain
  SELECT COUNT(*) INTO remaining_orphans
  FROM (
    SELECT user_id FROM tasks
    UNION ALL
    SELECT user_id FROM focus_sessions
    UNION ALL
    SELECT user_id FROM events
    UNION ALL
    SELECT user_id FROM conversations
    UNION ALL
    SELECT user_id FROM mood_entries
    UNION ALL
    SELECT user_id FROM preferences
  ) AS all_refs
  WHERE NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = all_refs.user_id
  );
  
  IF remaining_orphans > 0 THEN
    RAISE WARNING 'Still have % orphaned records after cleanup!', remaining_orphans;
  ELSE
    RAISE NOTICE 'All orphaned records successfully removed. Safe to add foreign keys.';
  END IF;
END $$;

-- ============================================
-- LIST DEMO/TEST USER IDS FOR REFERENCE
-- ============================================

DO $$
DECLARE
  user_record RECORD;
BEGIN
  RAISE NOTICE 'Existing users in the database:';
  FOR user_record IN 
    SELECT id, email, name, created_at 
    FROM users 
    ORDER BY created_at DESC 
    LIMIT 10
  LOOP
    RAISE NOTICE 'User: % | Email: % | Name: % | Created: %', 
      user_record.id, 
      user_record.email, 
      user_record.name, 
      user_record.created_at;
  END LOOP;
END $$;