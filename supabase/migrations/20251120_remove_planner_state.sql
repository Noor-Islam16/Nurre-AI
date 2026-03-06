-- Migration: Remove planner_state table and related functions
-- Created: 2025-11-20
-- Description: Removes the background AI planner infrastructure that was eliminated per Architecture Specification
-- Reason: Architecture Specification Section 6.5 mandates "NO background AI that polls - event-driven only"
-- Related Task: GAP_P0_02 - Remove Background Planner Code
-- COMPLETED: 2025-11-24 - Run successfully on production

-- ============================================
-- STEP 1: Drop functions (they reference the table)
-- ============================================

-- Drop update_user_activity function
DROP FUNCTION IF EXISTS update_user_activity(UUID);

-- Drop handle_user_login function
DROP FUNCTION IF EXISTS handle_user_login(UUID);

-- Drop handle_user_logout function
DROP FUNCTION IF EXISTS handle_user_logout(UUID);

-- Drop toggle_planner_manual_override function
DROP FUNCTION IF EXISTS toggle_planner_manual_override(UUID, BOOLEAN);

-- Drop get_planner_state function
DROP FUNCTION IF EXISTS get_planner_state(UUID);

-- Drop deactivate_inactive_users function (if exists)
DROP FUNCTION IF EXISTS deactivate_inactive_users();

-- ============================================
-- STEP 2: Drop trigger
-- ============================================

-- Drop the update trigger (if exists)
DROP TRIGGER IF EXISTS update_planner_state_updated_at ON planner_state;

-- ============================================
-- STEP 3: Drop table (cascades policies and indexes)
-- ============================================

-- Drop planner_state table with CASCADE to remove:
-- - All RLS policies
-- - All indexes
-- - All foreign key constraints
DROP TABLE IF EXISTS planner_state CASCADE;

-- ============================================
-- STEP 4: Clean up any orphaned update_updated_at_column function
-- Note: This function might be shared by other tables, so we check first
-- ============================================

-- Only drop if no other tables use this trigger function
-- Check: SELECT tgname FROM pg_trigger WHERE tgfoid = 'update_updated_at_column'::regproc;
-- For safety, we'll leave this function as it may be used by other tables

-- ============================================
-- VERIFICATION QUERIES (run these manually to verify cleanup)
-- ============================================

-- Check that table is gone:
-- SELECT * FROM information_schema.tables WHERE table_name = 'planner_state';

-- Check that functions are gone:
-- SELECT proname FROM pg_proc WHERE proname IN (
--   'update_user_activity',
--   'handle_user_login',
--   'handle_user_logout',
--   'toggle_planner_manual_override',
--   'get_planner_state',
--   'deactivate_inactive_users'
-- );

-- ============================================
-- NOTES
-- ============================================

-- This migration removes:
-- - 1 table: planner_state
-- - 6 functions: update_user_activity, handle_user_login, handle_user_logout,
--                toggle_planner_manual_override, get_planner_state, deactivate_inactive_users
-- - 5 indexes: idx_planner_state_user_id, idx_planner_state_next_tick,
--              idx_planner_state_active, idx_planner_state_last_activity,
--              idx_planner_state_manual_override
-- - 4 RLS policies on planner_state
-- - 1 trigger: update_planner_state_updated_at

-- The original migration file remains in supabase/migrations/ for history:
-- - 20250119_add_planner_state_table.sql
-- - rollback/20250119_add_planner_state_table_rollback.sql (if exists)
