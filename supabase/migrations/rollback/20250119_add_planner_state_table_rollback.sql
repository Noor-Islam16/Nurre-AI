-- Rollback Migration: Remove planner_state table and related functions
-- Created: 2025-01-19
-- Description: Removes the planner_state table and all related functions
-- WARNING: This will permanently delete all planner state data

-- Drop triggers first
DROP TRIGGER IF EXISTS update_planner_state_updated_at ON planner_state;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_planner_state(UUID) CASCADE;
DROP FUNCTION IF EXISTS toggle_planner_manual_override(UUID, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS handle_user_logout(UUID) CASCADE;
DROP FUNCTION IF EXISTS handle_user_login(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_user_activity(UUID) CASCADE;

-- Drop policies
DROP POLICY IF EXISTS "Service role can manage all planner_state" ON planner_state;
DROP POLICY IF EXISTS "Users can insert own planner_state" ON planner_state;
DROP POLICY IF EXISTS "Users can update own planner_state" ON planner_state;
DROP POLICY IF EXISTS "Users can view own planner_state" ON planner_state;

-- Drop indexes
DROP INDEX IF EXISTS idx_planner_state_manual_override;
DROP INDEX IF EXISTS idx_planner_state_last_activity;
DROP INDEX IF EXISTS idx_planner_state_active;
DROP INDEX IF EXISTS idx_planner_state_next_tick;
DROP INDEX IF EXISTS idx_planner_state_user_id;

-- Drop the table
DROP TABLE IF EXISTS planner_state CASCADE;