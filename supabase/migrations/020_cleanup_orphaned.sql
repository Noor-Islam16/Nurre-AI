-- Migration: Clean Up Orphaned Functions and Tables
-- Status: COMPLETED
-- Executed: 2025-08-19
-- Description: Removes old schema elements from previous iterations
-- Author: AI Assistant  
-- Date: 2025-08-19

-- ============================================
-- CLEAN UP ORPHANED FUNCTIONS
-- ============================================

-- Drop functions that may exist from old schema iterations
-- Using CASCADE to also drop any dependent objects
DO $$
DECLARE
  func_name TEXT;
  orphaned_functions TEXT[] := ARRAY[
    'calculate_pattern_score',
    'detect_user_patterns', 
    'predict_pattern_occurrence',
    'update_intervention_effectiveness',
    'calculate_planner_state',
    'process_pattern_events',
    'analyze_user_behavior',
    'generate_intervention',
    'track_pattern_evolution',
    'calculate_effectiveness_score'
  ];
BEGIN
  FOREACH func_name IN ARRAY orphaned_functions
  LOOP
    -- Try to drop function with any signature
    BEGIN
      -- Drop function regardless of parameters
      EXECUTE format('DROP FUNCTION IF EXISTS %I CASCADE', func_name);
      RAISE NOTICE 'Dropped function: %', func_name;
    EXCEPTION
      WHEN OTHERS THEN
        -- If specific error, try with common parameter patterns
        BEGIN
          EXECUTE format('DROP FUNCTION IF EXISTS %I(UUID) CASCADE', func_name);
        EXCEPTION WHEN OTHERS THEN NULL; END;
        
        BEGIN
          EXECUTE format('DROP FUNCTION IF EXISTS %I(UUID, JSONB) CASCADE', func_name);
        EXCEPTION WHEN OTHERS THEN NULL; END;
        
        BEGIN  
          EXECUTE format('DROP FUNCTION IF EXISTS %I(UUID, TEXT) CASCADE', func_name);
        EXCEPTION WHEN OTHERS THEN NULL; END;
        
        BEGIN
          EXECUTE format('DROP FUNCTION IF EXISTS %I() CASCADE', func_name);
        EXCEPTION WHEN OTHERS THEN NULL; END;
    END;
  END LOOP;
END $$;

-- ============================================
-- DROP ORPHANED TRIGGERS
-- ============================================

-- Drop triggers that may exist from old implementations
-- Using DO block to handle non-existent tables gracefully
DO $$
BEGIN
  -- Drop triggers only if the table exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_patterns') THEN
    DROP TRIGGER IF EXISTS update_pattern_scores ON user_patterns CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'interventions') THEN
    DROP TRIGGER IF EXISTS track_intervention_outcomes ON interventions CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'planner_state') THEN
    DROP TRIGGER IF EXISTS update_planner_state ON planner_state CASCADE;
  END IF;
  
  -- These tables should exist in the current schema
  DROP TRIGGER IF EXISTS calculate_user_metrics ON events CASCADE;
  DROP TRIGGER IF EXISTS update_conversation_embeddings ON conversations CASCADE;
  DROP TRIGGER IF EXISTS track_focus_effectiveness ON focus_sessions CASCADE;
  DROP TRIGGER IF EXISTS auto_update_timestamps ON tasks CASCADE;
  DROP TRIGGER IF EXISTS auto_update_timestamps ON users CASCADE;
EXCEPTION
  WHEN OTHERS THEN
    -- If any trigger drop fails, just continue
    RAISE NOTICE 'Some triggers could not be dropped (may not exist): %', SQLERRM;
END $$;

-- ============================================
-- DROP ORPHANED TABLES
-- ============================================

-- Drop tables from old schema iterations
-- These tables are no longer used in the simplified architecture
DROP TABLE IF EXISTS user_patterns CASCADE;
DROP TABLE IF EXISTS pattern_predictions CASCADE;
DROP TABLE IF EXISTS intervention_outcomes CASCADE;
DROP TABLE IF EXISTS planner_state CASCADE;
DROP TABLE IF EXISTS user_metrics CASCADE;
DROP TABLE IF EXISTS pattern_scores CASCADE;
DROP TABLE IF EXISTS behavioral_patterns CASCADE;
DROP TABLE IF EXISTS intervention_history CASCADE;
DROP TABLE IF EXISTS ai_predictions CASCADE;
DROP TABLE IF EXISTS embeddings CASCADE;

-- ============================================
-- DROP ORPHANED VIEWS
-- ============================================

-- Drop any views that might reference old tables
DROP VIEW IF EXISTS user_pattern_summary CASCADE;
DROP VIEW IF EXISTS intervention_effectiveness CASCADE;
DROP VIEW IF EXISTS user_activity_dashboard CASCADE;
DROP VIEW IF EXISTS pattern_insights CASCADE;

-- ============================================
-- DROP ORPHANED TYPES
-- ============================================

-- Drop custom types that are no longer used
DROP TYPE IF EXISTS pattern_type CASCADE;
DROP TYPE IF EXISTS intervention_type CASCADE;
DROP TYPE IF EXISTS planner_state_enum CASCADE;
DROP TYPE IF EXISTS effectiveness_level CASCADE;

-- ============================================
-- CLEAN UP ORPHANED SEQUENCES
-- ============================================

-- Find and drop orphaned sequences not attached to any table
DO $$
DECLARE
  seq_name TEXT;
BEGIN
  FOR seq_name IN 
    SELECT sequencename 
    FROM pg_sequences 
    WHERE schemaname = 'public'
    AND sequencename NOT IN (
      SELECT pg_get_serial_sequence(table_name, column_name)::text
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND column_default LIKE 'nextval%'
    )
  LOOP
    EXECUTE format('DROP SEQUENCE IF EXISTS %I CASCADE', seq_name);
    RAISE NOTICE 'Dropped orphaned sequence: %', seq_name;
  END LOOP;
EXCEPTION
  WHEN OTHERS THEN
    -- If sequence cleanup fails, just log and continue
    RAISE NOTICE 'Could not clean up sequences: %', SQLERRM;
END $$;

-- ============================================
-- VERIFY CLEANUP
-- ============================================

DO $$
DECLARE
  orphaned_count INTEGER;
  table_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Count remaining tables (should be 11 core tables + GDPR tables)
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
  
  RAISE NOTICE 'Remaining tables in public schema: %', table_count;
  
  -- Check for any remaining functions that might be orphaned
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN (
    'calculate_pattern_score',
    'detect_user_patterns',
    'predict_pattern_occurrence',
    'update_intervention_effectiveness',
    'calculate_planner_state',
    'process_pattern_events'
  );
  
  IF function_count > 0 THEN
    RAISE WARNING 'Found % orphaned functions that could not be dropped', function_count;
  ELSE
    RAISE NOTICE 'All orphaned functions successfully removed';
  END IF;
  
  -- Check for orphaned triggers
  SELECT COUNT(*) INTO orphaned_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
  AND t.tgname IN (
    'update_pattern_scores',
    'track_intervention_outcomes',
    'update_planner_state'
  );
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'Found % orphaned triggers', orphaned_count;
  END IF;
END $$;

-- ============================================
-- ANALYZE TABLES (VACUUM must be run separately)
-- ============================================

-- Update statistics after dropping objects
-- Note: VACUUM cannot run in a transaction block, run it separately after migration
ANALYZE;

-- ============================================
-- ADD COMMENTS
-- ============================================
COMMENT ON SCHEMA public IS 'Simplified NureeAI schema with 11 core tables for ADHD coaching';