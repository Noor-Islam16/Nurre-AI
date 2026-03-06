-- Migration: Implement Rewards & Growth System
-- Status: COMPLETED
-- Executed: 2025-08-13
-- Purpose: Calculate user rewards, growth progress, and achievements

-- Function to calculate user's reward statistics
CREATE OR REPLACE FUNCTION get_user_rewards(p_user_id UUID)
RETURNS TABLE (
  current_streak INTEGER,
  longest_streak INTEGER,
  total_tasks_completed INTEGER,
  total_focus_minutes INTEGER,
  growth_percentage INTEGER,
  current_stage TEXT,
  tasks_today INTEGER,
  focus_today INTEGER,
  tasks_this_week INTEGER,
  early_bird_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      u.current_streak,
      u.longest_streak
    FROM users u
    WHERE u.id = p_user_id
  ),
  task_stats AS (
    SELECT 
      COUNT(*)::INTEGER as total_completed,
      COUNT(CASE WHEN DATE(completed_at) = CURRENT_DATE THEN 1 END)::INTEGER as completed_today,
      COUNT(CASE WHEN DATE(completed_at) >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::INTEGER as completed_this_week,
      COUNT(CASE WHEN EXTRACT(hour FROM completed_at) < 9 THEN 1 END)::INTEGER as early_bird_tasks
    FROM tasks
    WHERE user_id = p_user_id AND completed = true
  ),
  focus_stats AS (
    SELECT 
      COALESCE(SUM(actual_duration), 0)::INTEGER as total_minutes,
      COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN actual_duration ELSE 0 END), 0)::INTEGER as minutes_today
    FROM focus_sessions
    WHERE user_id = p_user_id AND completed = true
  )
  SELECT 
    us.current_streak,
    us.longest_streak,
    ts.total_completed,
    fs.total_minutes,
    -- Calculate growth percentage based on streak and total tasks
    LEAST(
      100,
      GREATEST(
        0,
        -- Base calculation: current streak contributes 50%, total tasks contribute 50%
        ((us.current_streak::FLOAT / 60) * 50 + 
         (LEAST(ts.total_completed, 200)::FLOAT / 200) * 50)::INTEGER
      )
    ) as growth_percentage,
    -- Determine growth stage based on combined progress
    CASE 
      WHEN us.current_streak >= 60 OR ts.total_completed >= 200 THEN 'Forest'
      WHEN us.current_streak >= 30 OR ts.total_completed >= 100 THEN 'Tree'
      WHEN us.current_streak >= 14 OR ts.total_completed >= 50 THEN 'Plant'
      WHEN us.current_streak >= 7 OR ts.total_completed >= 25 THEN 'Sapling'
      WHEN us.current_streak >= 3 OR ts.total_completed >= 10 THEN 'Sprout'
      ELSE 'Seed'
    END as current_stage,
    ts.completed_today as tasks_today,
    fs.minutes_today as focus_today,
    ts.completed_this_week as tasks_this_week,
    ts.early_bird_tasks as early_bird_count
  FROM user_stats us
  CROSS JOIN task_stats ts
  CROSS JOIN focus_stats fs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and unlock achievements
CREATE OR REPLACE FUNCTION check_user_achievements(p_user_id UUID)
RETURNS TABLE (
  achievement_id TEXT,
  unlocked BOOLEAN,
  progress INTEGER,
  target INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT * FROM get_user_rewards(p_user_id)
  )
  SELECT 
    'first-task'::TEXT as achievement_id,
    (s.total_tasks_completed > 0) as unlocked,
    LEAST(s.total_tasks_completed, 1)::INTEGER as progress,
    1::INTEGER as target
  FROM stats s
  
  UNION ALL
  
  SELECT 
    'week-streak'::TEXT,
    (s.current_streak >= 7),
    s.current_streak::INTEGER,
    7::INTEGER
  FROM stats s
  
  UNION ALL
  
  SELECT 
    'focus-master'::TEXT,
    (COUNT(*) >= 10),
    COUNT(*)::INTEGER,
    10::INTEGER
  FROM focus_sessions fs, stats s
  WHERE fs.user_id = p_user_id AND fs.completed = true
  GROUP BY s.current_streak
  
  UNION ALL
  
  SELECT 
    'task-crusher'::TEXT,
    (s.total_tasks_completed >= 50),
    s.total_tasks_completed::INTEGER,
    50::INTEGER
  FROM stats s
  
  UNION ALL
  
  SELECT 
    'early-bird'::TEXT,
    (s.early_bird_count > 0),
    s.early_bird_count::INTEGER,
    1::INTEGER
  FROM stats s
  
  UNION ALL
  
  SELECT 
    'month-streak'::TEXT,
    (s.current_streak >= 30),
    s.current_streak::INTEGER,
    30::INTEGER
  FROM stats s
  
  UNION ALL
  
  SELECT 
    'focus-century'::TEXT,
    (s.total_focus_minutes >= 6000), -- 100 hours
    (s.total_focus_minutes / 60)::INTEGER,
    100::INTEGER
  FROM stats s
  
  UNION ALL
  
  SELECT 
    'weekend-warrior'::TEXT,
    (COUNT(*) > 0),
    COUNT(*)::INTEGER,
    1::INTEGER
  FROM tasks t, stats s
  WHERE t.user_id = p_user_id 
    AND t.completed = true
    AND EXTRACT(dow FROM t.completed_at) IN (0, 6) -- Sunday or Saturday
  GROUP BY s.current_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_rewards(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_achievements(UUID) TO authenticated;

-- Add comments to document the functions
COMMENT ON FUNCTION get_user_rewards IS 'Calculates comprehensive reward statistics for a user';
COMMENT ON FUNCTION check_user_achievements IS 'Checks which achievements a user has unlocked';