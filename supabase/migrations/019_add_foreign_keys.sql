-- Migration: Add Foreign Key Constraints
-- Status: COMPLETED
-- Executed: 2025-08-19
-- Description: Adds missing foreign key constraints to ensure referential integrity
-- Author: AI Assistant
-- Date: 2025-08-19

-- ============================================
-- ADD FOREIGN KEY CONSTRAINTS
-- ============================================

-- Tasks table: parent_id references tasks(id)
ALTER TABLE tasks 
  DROP CONSTRAINT IF EXISTS tasks_parent_id_fkey;

ALTER TABLE tasks 
  ADD CONSTRAINT tasks_parent_id_fkey 
  FOREIGN KEY (parent_id) 
  REFERENCES tasks(id) 
  ON DELETE CASCADE;

-- Focus sessions table: task_id references tasks(id)
ALTER TABLE focus_sessions
  DROP CONSTRAINT IF EXISTS focus_sessions_task_id_fkey;

ALTER TABLE focus_sessions
  ADD CONSTRAINT focus_sessions_task_id_fkey
  FOREIGN KEY (task_id)
  REFERENCES tasks(id)
  ON DELETE SET NULL;

-- Focus sessions table: user_id references users(id)
ALTER TABLE focus_sessions
  DROP CONSTRAINT IF EXISTS focus_sessions_user_id_fkey;

ALTER TABLE focus_sessions
  ADD CONSTRAINT focus_sessions_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Tasks table: user_id references users(id)
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Conversations table: user_id references users(id)
ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;

ALTER TABLE conversations
  ADD CONSTRAINT conversations_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Events table: user_id references users(id)
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_user_id_fkey;

ALTER TABLE events
  ADD CONSTRAINT events_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Mood entries table: user_id references users(id)
ALTER TABLE mood_entries
  DROP CONSTRAINT IF EXISTS mood_entries_user_id_fkey;

ALTER TABLE mood_entries
  ADD CONSTRAINT mood_entries_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Preferences table: user_id references users(id)
ALTER TABLE preferences
  DROP CONSTRAINT IF EXISTS preferences_user_id_fkey;

ALTER TABLE preferences
  ADD CONSTRAINT preferences_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- ============================================
-- ADD INDEXES FOR FOREIGN KEYS
-- ============================================

-- Index for tasks.parent_id (for subtask queries)
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id 
  ON tasks(parent_id) 
  WHERE parent_id IS NOT NULL;

-- Index for focus_sessions.task_id (for session-task lookups)
CREATE INDEX IF NOT EXISTS idx_focus_sessions_task_id 
  ON focus_sessions(task_id) 
  WHERE task_id IS NOT NULL;

-- Index for focus_sessions.user_id (for user session queries)
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id
  ON focus_sessions(user_id);

-- Index for tasks.user_id (already exists as idx_tasks_user, but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_tasks_user_id
  ON tasks(user_id);

-- Index for conversations.user_id (for user conversation queries)
CREATE INDEX IF NOT EXISTS idx_conversations_user_id
  ON conversations(user_id);

-- Index for events.user_id (for user event queries)
CREATE INDEX IF NOT EXISTS idx_events_user_id
  ON events(user_id);

-- Index for mood_entries.user_id (for user mood queries)
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id
  ON mood_entries(user_id);

-- Index for preferences.user_id (for preference lookups)
CREATE INDEX IF NOT EXISTS idx_preferences_user_id
  ON preferences(user_id);

-- ============================================
-- VERIFY CONSTRAINTS WERE CREATED
-- ============================================
DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  -- Count the foreign key constraints we just created
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
  
  RAISE NOTICE 'Created % foreign key constraints', constraint_count;
  
  IF constraint_count < 8 THEN
    RAISE WARNING 'Expected 8 constraints but only found %', constraint_count;
  END IF;
END $$;

-- ============================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON CONSTRAINT tasks_parent_id_fkey ON tasks IS 'Ensures subtasks reference valid parent tasks';
COMMENT ON CONSTRAINT tasks_user_id_fkey ON tasks IS 'Ensures tasks belong to valid users';
COMMENT ON CONSTRAINT focus_sessions_task_id_fkey ON focus_sessions IS 'Links focus sessions to optional tasks';
COMMENT ON CONSTRAINT focus_sessions_user_id_fkey ON focus_sessions IS 'Ensures focus sessions belong to valid users';
COMMENT ON CONSTRAINT conversations_user_id_fkey ON conversations IS 'Ensures conversations belong to valid users';
COMMENT ON CONSTRAINT events_user_id_fkey ON events IS 'Ensures events belong to valid users';
COMMENT ON CONSTRAINT mood_entries_user_id_fkey ON mood_entries IS 'Ensures mood entries belong to valid users';
COMMENT ON CONSTRAINT preferences_user_id_fkey ON preferences IS 'Ensures preferences belong to valid users';