-- Migration: Add planner_state table and related functions for AI Brain feature
-- Created: 2025-01-19
-- Description: Creates the planner_state table for tracking AI brain execution and user activity
-- Status: COMPLETED - 2025-09-19
-- Applied successfully - Fixes "relation planner_state does not exist" error on login

-- Create planner_state table for tracking planner execution intervals
CREATE TABLE IF NOT EXISTS planner_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  last_tick_at TIMESTAMPTZ,
  next_tick_at TIMESTAMPTZ,
  tick_interval_ms INTEGER DEFAULT 600000, -- Default 10 minutes
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Activity tracking columns
  last_activity_at TIMESTAMPTZ,
  manual_override BOOLEAN DEFAULT NULL,
  activity_streak_days INTEGER DEFAULT 0,
  last_login_at TIMESTAMPTZ,
  last_logout_at TIMESTAMPTZ,

  UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_planner_state_user_id ON planner_state(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_state_next_tick ON planner_state(next_tick_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_planner_state_active ON planner_state(is_active);
CREATE INDEX IF NOT EXISTS idx_planner_state_last_activity ON planner_state(last_activity_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_planner_state_manual_override ON planner_state(manual_override) WHERE manual_override IS NOT NULL;

-- Add RLS (Row Level Security) policies
ALTER TABLE planner_state ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own planner state
CREATE POLICY "Users can view own planner_state" ON planner_state
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own planner state
CREATE POLICY "Users can update own planner_state" ON planner_state
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can insert their own planner state
CREATE POLICY "Users can insert own planner_state" ON planner_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can manage all planner states
CREATE POLICY "Service role can manage all planner_state" ON planner_state
  FOR ALL USING (auth.role() = 'service_role');

-- Create a function to update activity timestamp
CREATE OR REPLACE FUNCTION update_user_activity(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE planner_state
  SET
    last_activity_at = NOW(),
    is_active = CASE
      WHEN manual_override = false THEN false
      ELSE true
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Update activity streak if last activity was yesterday
  UPDATE planner_state
  SET activity_streak_days =
    CASE
      WHEN last_activity_at::date = CURRENT_DATE - INTERVAL '1 day'
      THEN activity_streak_days + 1
      WHEN last_activity_at::date < CURRENT_DATE - INTERVAL '1 day'
      THEN 1
      ELSE activity_streak_days
    END
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to handle user login
CREATE OR REPLACE FUNCTION handle_user_login(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Update existing planner state
  UPDATE planner_state
  SET
    is_active = CASE
      WHEN manual_override = false THEN false
      ELSE true
    END,
    last_activity_at = NOW(),
    last_login_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Create planner state if it doesn't exist
  INSERT INTO planner_state (user_id, is_active, last_activity_at, last_login_at)
  VALUES (p_user_id, true, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to handle user logout
CREATE OR REPLACE FUNCTION handle_user_logout(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE planner_state
  SET
    is_active = false,
    last_logout_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to toggle manual override
CREATE OR REPLACE FUNCTION toggle_planner_manual_override(p_user_id UUID, p_override BOOLEAN)
RETURNS void AS $$
BEGIN
  UPDATE planner_state
  SET
    manual_override = p_override,
    is_active = CASE
      WHEN p_override = false THEN false
      ELSE true
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Create planner state if it doesn't exist
  INSERT INTO planner_state (user_id, manual_override, is_active)
  VALUES (p_user_id, p_override, CASE WHEN p_override = false THEN false ELSE true END)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get planner state
CREATE OR REPLACE FUNCTION get_planner_state(p_user_id UUID)
RETURNS TABLE (
  is_active BOOLEAN,
  last_tick_at TIMESTAMPTZ,
  next_tick_at TIMESTAMPTZ,
  tick_interval_ms INTEGER,
  manual_override BOOLEAN,
  last_activity_at TIMESTAMPTZ,
  activity_streak_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.is_active,
    ps.last_tick_at,
    ps.next_tick_at,
    ps.tick_interval_ms,
    ps.manual_override,
    ps.last_activity_at,
    ps.activity_streak_days
  FROM planner_state ps
  WHERE ps.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION update_user_activity TO authenticated;
GRANT EXECUTE ON FUNCTION handle_user_login TO authenticated;
GRANT EXECUTE ON FUNCTION handle_user_logout TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_planner_manual_override TO authenticated;
GRANT EXECUTE ON FUNCTION get_planner_state TO authenticated;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_planner_state_updated_at
  BEFORE UPDATE ON planner_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial planner state for existing users
INSERT INTO planner_state (user_id, is_active, created_at, updated_at)
SELECT
  id as user_id,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM planner_state WHERE planner_state.user_id = users.id
);