-- Fix for missing database migrations
-- Generated on: 2025-08-13T09:34:12.744Z


-- Create planner_state table for tracking planner execution intervals
CREATE TABLE IF NOT EXISTS planner_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_planner_state_user_id ON planner_state(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_state_next_tick ON planner_state(next_tick_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_planner_state_active ON planner_state(is_active);
CREATE INDEX IF NOT EXISTS idx_planner_state_last_activity ON planner_state(last_activity_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_planner_state_manual_override ON planner_state(manual_override) WHERE manual_override IS NOT NULL;



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
$$ LANGUAGE plpgsql;


