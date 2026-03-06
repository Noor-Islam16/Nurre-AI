-- Migration: 026_add_guardrail_logs.sql
-- Date: 2025-08-20
-- Status: COMPLETED
-- Purpose: Add comprehensive guardrail logging and analytics
-- Changes:
--   - Creates guardrail_logs table for all guardrail actions
--   - Adds guardrail_stats view for hourly analytics
--   - Implements soft delete with cleanup function
--   - Tracks successful interactions and violations
--   - Provides comprehensive monitoring capabilities

-- Create guardrail_logs table for comprehensive guardrail action tracking
CREATE TABLE IF NOT EXISTS guardrail_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'blocked_abuse',
    'filtered_content',
    'response_boundary_violation',
    'successful_interaction',
    'guardrail_error',
    'rate_limit_exceeded'
  )),
  reason TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata JSONB,
  is_deleted BOOLEAN DEFAULT FALSE, -- Soft delete flag for consistency
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_guardrail_user ON guardrail_logs(user_id, timestamp DESC);
CREATE INDEX idx_guardrail_action ON guardrail_logs(action, timestamp DESC);
CREATE INDEX idx_guardrail_severity ON guardrail_logs(severity) WHERE severity IS NOT NULL;
CREATE INDEX idx_guardrail_timestamp ON guardrail_logs(timestamp DESC);

-- Add RLS policies
ALTER TABLE guardrail_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own guardrail logs
CREATE POLICY "Users can view own guardrail logs" ON guardrail_logs
  FOR SELECT USING (auth.uid() = user_id);

-- System can insert and manage guardrail logs
CREATE POLICY "System can manage guardrail logs" ON guardrail_logs
  FOR ALL USING (true);

-- Add comment
COMMENT ON TABLE guardrail_logs IS 'Comprehensive tracking of all guardrail actions including filters, abuse detection, and successful interactions';

-- Create guardrail stats view for analytics
CREATE OR REPLACE VIEW guardrail_stats AS
SELECT 
  user_id,
  action,
  severity,
  COUNT(*) as count,
  DATE_TRUNC('hour', timestamp) as hour
FROM guardrail_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY user_id, action, severity, hour;

-- Grant permissions on the view
GRANT SELECT ON guardrail_stats TO authenticated;

-- Function to cleanup old guardrail logs (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_guardrail_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  temp_count INTEGER;
BEGIN
  -- Soft delete old successful interactions and errors (30 days)
  UPDATE guardrail_logs
  SET is_deleted = TRUE
  WHERE timestamp < NOW() - INTERVAL '30 days'
  AND action IN ('successful_interaction', 'guardrail_error')
  AND is_deleted = FALSE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Soft delete old violations and filters (90 days)
  UPDATE guardrail_logs
  SET is_deleted = TRUE
  WHERE timestamp < NOW() - INTERVAL '90 days'
  AND action IN ('blocked_abuse', 'filtered_content', 'response_boundary_violation', 'rate_limit_exceeded')
  AND is_deleted = FALSE;
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-guardrail-logs', '0 3 * * *', 'SELECT cleanup_old_guardrail_logs();');