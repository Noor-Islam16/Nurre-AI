-- Migration: GDPR/CCPA Privacy Compliance
-- Status: COMPLETED
-- Executed: 2025-08-18

-- Create user consent tracking table
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  necessary_consent BOOLEAN DEFAULT true,
  functional_consent BOOLEAN DEFAULT false,
  analytics_consent BOOLEAN DEFAULT false,
  marketing_consent BOOLEAN DEFAULT false,
  consented_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create data export requests table
CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  format TEXT CHECK (format IN ('json', 'csv')) DEFAULT 'json',
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  download_url TEXT,
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create data deletion requests table (soft delete approach)
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'), -- 30 day grace period
  status TEXT CHECK (status IN ('pending', 'scheduled', 'processing', 'completed', 'cancelled')) DEFAULT 'pending',
  reason TEXT,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create privacy audit log table
CREATE TABLE IF NOT EXISTS privacy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('consent_given', 'consent_withdrawn', 'data_exported', 'data_deleted', 'preferences_updated')),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add soft delete columns to existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

ALTER TABLE events ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE focus_sessions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_version ON user_consents(version);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_scheduled ON data_deletion_requests(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_user_id ON privacy_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_action ON privacy_audit_log(action);

-- Create RLS policies
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only view/manage their own consent
CREATE POLICY "Users can view own consent" ON user_consents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent" ON user_consents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consent" ON user_consents
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only view/manage their own export requests
CREATE POLICY "Users can view own export requests" ON data_export_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own export requests" ON data_export_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only view/manage their own deletion requests
CREATE POLICY "Users can view own deletion requests" ON data_deletion_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own deletion requests" ON data_deletion_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel own deletion requests" ON data_deletion_requests
  FOR UPDATE USING (auth.uid() = user_id AND status IN ('pending', 'scheduled'));

-- Privacy audit log is append-only, users can view their own
CREATE POLICY "Users can view own audit log" ON privacy_audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- Function to handle data retention cleanup
CREATE OR REPLACE FUNCTION cleanup_old_user_data()
RETURNS void AS $$
DECLARE
  retention_days INTEGER;
BEGIN
  -- Get retention settings from preferences or use defaults
  retention_days := 90; -- Default retention period
  
  -- Soft delete old events
  UPDATE events 
  SET is_deleted = true 
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
    AND is_deleted = false;
  
  -- Soft delete old focus sessions
  UPDATE focus_sessions 
  SET is_deleted = true 
  WHERE created_at < NOW() - (retention_days * 2 || ' days')::INTERVAL
    AND is_deleted = false;
  
  -- Log the cleanup action
  INSERT INTO privacy_audit_log (action, details)
  VALUES ('data_deleted', jsonb_build_object(
    'type', 'retention_cleanup',
    'retention_days', retention_days,
    'timestamp', NOW()
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process scheduled deletions
CREATE OR REPLACE FUNCTION process_scheduled_deletions()
RETURNS void AS $$
DECLARE
  deletion_request RECORD;
BEGIN
  FOR deletion_request IN 
    SELECT * FROM data_deletion_requests 
    WHERE status = 'scheduled' 
      AND scheduled_for <= NOW()
  LOOP
    -- Update request status
    UPDATE data_deletion_requests 
    SET status = 'processing', updated_at = NOW()
    WHERE id = deletion_request.id;
    
    -- Soft delete user data
    UPDATE users SET is_deleted = true WHERE id = deletion_request.user_id;
    UPDATE events SET is_deleted = true WHERE user_id = deletion_request.user_id;
    UPDATE tasks SET is_deleted = true WHERE user_id = deletion_request.user_id;
    UPDATE focus_sessions SET is_deleted = true WHERE user_id = deletion_request.user_id;
    UPDATE conversations SET is_deleted = true WHERE user_id = deletion_request.user_id;
    UPDATE mood_entries SET is_deleted = true WHERE user_id = deletion_request.user_id;
    
    -- Mark request as completed
    UPDATE data_deletion_requests 
    SET status = 'completed', 
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = deletion_request.id;
    
    -- Log the action
    INSERT INTO privacy_audit_log (user_id, action, details)
    VALUES (deletion_request.user_id, 'data_deleted', jsonb_build_object(
      'request_id', deletion_request.id,
      'type', 'user_requested',
      'timestamp', NOW()
    ));
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_consents_updated_at
  BEFORE UPDATE ON user_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_export_requests_updated_at
  BEFORE UPDATE ON data_export_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_deletion_requests_updated_at
  BEFORE UPDATE ON data_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();