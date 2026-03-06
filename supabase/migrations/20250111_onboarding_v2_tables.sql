-- Migration: Create Onboarding V2 Assessment Tables
-- Status: COMPLETED
-- Executed: 2025-01-11
-- Description: Creates tables for 28-item DSM-5 based ADHD screening assessment
-- Author: AI Assistant
-- Date: 2025-01-11

-- ============================================
-- CREATE ONBOARDING RESPONSES TABLE
-- ============================================

-- Store individual responses for each question
CREATE TABLE onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL CHECK (question_number >= 1 AND question_number <= 28),
  response TEXT NOT NULL, -- Stores numeric (1-5) or text responses
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, question_number)
);

-- Add comment for documentation
COMMENT ON TABLE onboarding_responses IS 'Stores individual responses for the 28-item DSM-5 based ADHD assessment';
COMMENT ON COLUMN onboarding_responses.question_number IS 'Question number from 1 to 28, mapping to specific assessment items';
COMMENT ON COLUMN onboarding_responses.response IS 'User response - can be numeric (1-5 for Likert), text for multiple choice, or JSON array for multi-select';

-- ============================================
-- CREATE ONBOARDING RESULTS TABLE
-- ============================================

-- Store calculated results from the assessment
CREATE TABLE onboarding_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  -- Domain scores
  inatt_endorsed INTEGER NOT NULL CHECK (inatt_endorsed >= 0 AND inatt_endorsed <= 9),
  hyper_endorsed INTEGER NOT NULL CHECK (hyper_endorsed >= 0 AND hyper_endorsed <= 8),
  total_endorsed INTEGER NOT NULL,
  -- Severity percentages
  inatt_severity DECIMAL(5,2) CHECK (inatt_severity >= 0 AND inatt_severity <= 100),
  hyper_severity DECIMAL(5,2) CHECK (hyper_severity >= 0 AND hyper_severity <= 100),
  -- Classification
  adhd_presentation TEXT NOT NULL CHECK (adhd_presentation IN ('combined', 'inattentive', 'hyperactive', 'borderline', 'negative')),
  -- Gates
  onset_childhood BOOLEAN NOT NULL,
  impairment BOOLEAN NOT NULL,
  -- Routing signals
  top_signals JSONB, -- Array of strings like ["loses_things", "avoids_effort"]
  -- Metadata
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  assessment_version INTEGER DEFAULT 2
);

-- Add comments for documentation
COMMENT ON TABLE onboarding_results IS 'Stores calculated results from the DSM-5 based ADHD assessment';
COMMENT ON COLUMN onboarding_results.inatt_endorsed IS 'Number of inattention items endorsed (scored ≥4 on 1-5 scale)';
COMMENT ON COLUMN onboarding_results.hyper_endorsed IS 'Number of hyperactivity/impulsivity items endorsed (scored ≥4 on 1-5 scale)';
COMMENT ON COLUMN onboarding_results.inatt_severity IS 'Inattention severity percentage (0-100)';
COMMENT ON COLUMN onboarding_results.hyper_severity IS 'Hyperactivity/impulsivity severity percentage (0-100)';
COMMENT ON COLUMN onboarding_results.adhd_presentation IS 'DSM-5 based classification: combined, inattentive, hyperactive, borderline, or negative';
COMMENT ON COLUMN onboarding_results.onset_childhood IS 'Whether symptoms started before age 12 (DSM-5 criterion)';
COMMENT ON COLUMN onboarding_results.impairment IS 'Whether significant impairment is present (DSM-5 criterion)';
COMMENT ON COLUMN onboarding_results.top_signals IS 'JSON array of top scoring symptoms for personalization';

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_onboarding_responses_user_id ON onboarding_responses(user_id);
CREATE INDEX idx_onboarding_results_user_id ON onboarding_results(user_id);
CREATE INDEX idx_onboarding_results_presentation ON onboarding_results(adhd_presentation);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on both tables
ALTER TABLE onboarding_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_results ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES FOR ONBOARDING_RESPONSES
-- ============================================

-- Users can only see their own responses
CREATE POLICY "Users can view own onboarding responses"
  ON onboarding_responses FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own responses
CREATE POLICY "Users can create own onboarding responses"
  ON onboarding_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own responses
CREATE POLICY "Users can update own onboarding responses"
  ON onboarding_responses FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own responses
CREATE POLICY "Users can delete own onboarding responses"
  ON onboarding_responses FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- CREATE RLS POLICIES FOR ONBOARDING_RESULTS
-- ============================================

-- Users can only see their own results
CREATE POLICY "Users can view own onboarding results"
  ON onboarding_results FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own results
CREATE POLICY "Users can create own onboarding results"
  ON onboarding_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own results
CREATE POLICY "Users can update own onboarding results"
  ON onboarding_results FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own results
CREATE POLICY "Users can delete own onboarding results"
  ON onboarding_results FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- CREATE UPDATED_AT TRIGGERS
-- ============================================

-- Add updated_at column to onboarding_responses
ALTER TABLE onboarding_responses 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());

-- Add updated_at column to onboarding_results
ALTER TABLE onboarding_results 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());

-- Create trigger for onboarding_responses
CREATE TRIGGER update_onboarding_responses_updated_at
  BEFORE UPDATE ON onboarding_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for onboarding_results
CREATE TRIGGER update_onboarding_results_updated_at
  BEFORE UPDATE ON onboarding_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFY MIGRATION
-- ============================================

DO $$
BEGIN
  -- Check if onboarding_responses table was created
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'onboarding_responses'
  ) THEN
    RAISE EXCEPTION 'Migration failed: Table onboarding_responses was not created';
  END IF;

  -- Check if onboarding_results table was created
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'onboarding_results'
  ) THEN
    RAISE EXCEPTION 'Migration failed: Table onboarding_results was not created';
  END IF;

  -- Check if indexes were created
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = 'idx_onboarding_responses_user_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: Index idx_onboarding_responses_user_id was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname = 'idx_onboarding_results_user_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: Index idx_onboarding_results_user_id was not created';
  END IF;

  -- Check if RLS is enabled
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'onboarding_responses' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'Migration failed: RLS not enabled on onboarding_responses';
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'onboarding_results' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'Migration failed: RLS not enabled on onboarding_results';
  END IF;
  
  RAISE NOTICE 'Migration successful: Onboarding V2 tables created with RLS policies and indexes';
END $$;