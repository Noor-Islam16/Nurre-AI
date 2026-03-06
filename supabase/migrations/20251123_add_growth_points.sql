-- Migration: Add Growth Points System
-- Description: Adds cumulative growth points to replace streak-based gamification
-- Date: 2025-11-23
-- COMPLETED: 2025-11-24 - Run successfully on production

-- Add growth points columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS growth_points INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_daily_bonus DATE,
ADD COLUMN IF NOT EXISTS current_level INTEGER NOT NULL DEFAULT 1;

-- Add constraints
ALTER TABLE users
ADD CONSTRAINT growth_points_non_negative CHECK (growth_points >= 0),
ADD CONSTRAINT level_range CHECK (current_level >= 1 AND current_level <= 10);

-- Create index for leaderboard queries (future feature)
CREATE INDEX IF NOT EXISTS idx_users_growth_points ON users(growth_points DESC);

-- Function to calculate level from growth points
CREATE OR REPLACE FUNCTION calculate_level(gp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF gp >= 50000 THEN RETURN 10;
  ELSIF gp >= 20000 THEN RETURN 9;
  ELSIF gp >= 10000 THEN RETURN 8;
  ELSIF gp >= 5000 THEN RETURN 7;
  ELSIF gp >= 2000 THEN RETURN 6;
  ELSIF gp >= 1000 THEN RETURN 5;
  ELSIF gp >= 500 THEN RETURN 4;
  ELSIF gp >= 250 THEN RETURN 3;
  ELSIF gp >= 100 THEN RETURN 2;
  ELSE RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to add growth points and update level
-- Uses SECURITY DEFINER pattern per architecture standards
CREATE OR REPLACE FUNCTION add_growth_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(new_total INTEGER, new_level INTEGER, leveled_up BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  old_level INTEGER;
  updated_points INTEGER;
  updated_level INTEGER;
BEGIN
  -- Verify caller owns the record
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get current level
  SELECT current_level INTO old_level FROM users WHERE id = p_user_id;

  -- Update points and recalculate level
  UPDATE users
  SET
    growth_points = growth_points + p_points,
    current_level = calculate_level(growth_points + p_points),
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING growth_points, current_level INTO updated_points, updated_level;

  -- Return results
  RETURN QUERY SELECT
    updated_points,
    updated_level,
    (updated_level > COALESCE(old_level, 1));
END;
$$;

-- Comments for documentation
COMMENT ON COLUMN users.growth_points IS 'Cumulative growth points earned from all activities';
COMMENT ON COLUMN users.last_daily_bonus IS 'Date of last daily login bonus claim';
COMMENT ON COLUMN users.current_level IS 'Cached level calculated from growth_points';
