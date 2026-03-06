-- Migration: 20250117_add_distinct_users_rpc.sql
-- Status: COMPLETED
-- Applied: 2025-09-17
-- Purpose: Optimize admin console performance by adding RPC function and indexes

-- Create RPC function for efficiently counting distinct users from events
CREATE OR REPLACE FUNCTION count_distinct_users_since(since_timestamp timestamptz)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT user_id)::integer
    FROM events
    WHERE created_at >= since_timestamp
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION count_distinct_users_since TO authenticated;

-- Add indexes to improve performance of the admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_events_created_user ON events(created_at DESC, user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_completed ON assessment_responses(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON users(onboarding_completed) WHERE onboarding_completed = true;
CREATE INDEX IF NOT EXISTS idx_admin_alerts_pending ON admin_alerts(requires_review, reviewed_at) WHERE requires_review = true AND reviewed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_restrictions_active ON user_restrictions(restriction_level) WHERE restriction_level != 'none';