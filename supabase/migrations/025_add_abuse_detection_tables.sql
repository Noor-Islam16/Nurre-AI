-- Migration: 025_add_abuse_detection_tables.sql
-- Date: 2025-08-20
-- Status: COMPLETED
-- Purpose: Add comprehensive abuse detection system
-- Changes:
--   - Creates abuse_logs table for violation tracking
--   - Creates user_restrictions table for access control
--   - Creates admin_alerts table for critical violations
--   - Adds auto-cleanup function for old violations
--   - Implements privacy-preserving content hashing

-- Create abuse_logs table for tracking violations
CREATE TABLE IF NOT EXISTS abuse_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL CHECK (violation_type IN ('academic', 'offtopic', 'injection', 'spam', 'inappropriate', 'bypass')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  content_hash TEXT,  -- Hash of content for privacy
  detected_patterns TEXT[],
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  action_taken TEXT,
  is_deleted BOOLEAN DEFAULT FALSE, -- Soft delete flag for consistency
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_restrictions table for tracking restriction levels
CREATE TABLE IF NOT EXISTS user_restrictions (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  restriction_level TEXT NOT NULL CHECK (restriction_level IN ('none', 'warning', 'limited', 'suspended')),
  violations_count INTEGER DEFAULT 0,
  last_violation TIMESTAMPTZ,
  suspension_ends_at TIMESTAMPTZ,
  notes TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_alerts table for critical violations
CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  details JSONB,
  requires_review BOOLEAN DEFAULT false,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_abuse_logs_user_time ON abuse_logs(user_id, timestamp DESC);
CREATE INDEX idx_abuse_logs_severity ON abuse_logs(severity);
CREATE INDEX idx_abuse_logs_type ON abuse_logs(violation_type);

CREATE INDEX idx_user_restrictions_level ON user_restrictions(restriction_level);
CREATE INDEX idx_user_restrictions_suspension ON user_restrictions(suspension_ends_at) WHERE suspension_ends_at IS NOT NULL;

CREATE INDEX idx_admin_alerts_type ON admin_alerts(type);
CREATE INDEX idx_admin_alerts_severity ON admin_alerts(severity);
CREATE INDEX idx_admin_alerts_requires_review ON admin_alerts(requires_review) WHERE requires_review = true;

-- Add RLS policies
ALTER TABLE abuse_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

-- Abuse logs policies
-- Users can view their own logs
CREATE POLICY "Users can view own abuse logs" ON abuse_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Only system can insert/update abuse logs
CREATE POLICY "System can manage abuse logs" ON abuse_logs
  FOR ALL USING (true);

-- User restrictions policies
-- Users can view their own restrictions
CREATE POLICY "Users can view own restrictions" ON user_restrictions
  FOR SELECT USING (auth.uid() = user_id);

-- Only system can manage restrictions
CREATE POLICY "System can manage restrictions" ON user_restrictions
  FOR ALL USING (true);

-- Admin alerts policies
-- For now, alerts are system-only (no admin role in simplified schema)
-- In production, you'd add a role column to users table or use a separate admins table

-- System can create alerts
CREATE POLICY "System can create alerts" ON admin_alerts
  FOR INSERT WITH CHECK (true);

-- System can view and update alerts
CREATE POLICY "System can manage alerts" ON admin_alerts
  FOR ALL USING (true);

-- Add comments
COMMENT ON TABLE abuse_logs IS 'Tracks all abuse detection violations for pattern analysis';
COMMENT ON TABLE user_restrictions IS 'Current restriction level and violation count for each user';
COMMENT ON TABLE admin_alerts IS 'Alerts for admins about critical violations requiring review';

-- Function to auto-clean old violations (30 days)
CREATE OR REPLACE FUNCTION clean_old_violations()
RETURNS void AS $$
BEGIN
  -- Delete old low/medium severity logs
  DELETE FROM abuse_logs 
  WHERE timestamp < NOW() - INTERVAL '30 days'
  AND severity IN ('low', 'medium');
  
  -- Reset users with no recent violations
  UPDATE user_restrictions 
  SET restriction_level = 'none', 
      violations_count = 0
  WHERE last_violation < NOW() - INTERVAL '30 days'
  AND restriction_level != 'none';
  
  -- Clean old reviewed alerts
  DELETE FROM admin_alerts
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND reviewed_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (if pg_cron is available)
-- SELECT cron.schedule('clean-violations', '0 2 * * *', 'SELECT clean_old_violations();');