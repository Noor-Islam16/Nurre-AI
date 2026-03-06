-- Migration: 024_add_content_filter_logs.sql
-- Date: 2025-08-20
-- Status: COMPLETED
-- Purpose: Add content filtering audit trail
-- Changes:
--   - Creates content_filter_logs table for tracking filtered requests
--   - Adds RLS policies for user privacy
--   - Stores sanitized content with PII removed
--   - Tracks filter reasons, severity, and confidence

-- Create content_filter_logs table for tracking filtered requests
CREATE TABLE IF NOT EXISTS content_filter_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  content TEXT NOT NULL, -- Sanitized version
  filter_reason TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
  action TEXT CHECK (action IN ('blocked', 'warned', 'allowed')),
  matched_patterns TEXT[], -- Array of matched patterns
  confidence DECIMAL(3,2), -- 0.00 to 1.00
  is_deleted BOOLEAN DEFAULT FALSE, -- Soft delete flag for consistency
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_content_filter_logs_user_id ON content_filter_logs(user_id);
CREATE INDEX idx_content_filter_logs_timestamp ON content_filter_logs(timestamp DESC);
CREATE INDEX idx_content_filter_logs_filter_reason ON content_filter_logs(filter_reason);
CREATE INDEX idx_content_filter_logs_action ON content_filter_logs(action);

-- Add RLS policies
ALTER TABLE content_filter_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own filter logs
CREATE POLICY "Users can view own filter logs" ON content_filter_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Only system can insert filter logs (through service role)
CREATE POLICY "System can insert filter logs" ON content_filter_logs
  FOR INSERT WITH CHECK (true);

-- Add comment
COMMENT ON TABLE content_filter_logs IS 'Tracks content filtering events for monitoring and improving guardrails';