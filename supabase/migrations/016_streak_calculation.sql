-- Migration: Implement Streak Calculation System
-- Status: COMPLETED
-- Executed: 2025-08-12
-- Purpose: Automatically track consecutive days of task completion

-- Function to update user streaks when a task is completed
CREATE OR REPLACE FUNCTION update_user_streaks(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_last_completion DATE;
  v_today DATE := CURRENT_DATE;
  v_current_streak INTEGER;
  v_tasks_completed_today INTEGER;
BEGIN
  -- Get the user's current streak
  SELECT current_streak INTO v_current_streak
  FROM users WHERE id = p_user_id;
  
  -- Check if user already completed a task today
  SELECT COUNT(*) INTO v_tasks_completed_today
  FROM tasks
  WHERE user_id = p_user_id 
    AND completed = true
    AND DATE(completed_at) = v_today;
  
  -- If this is not the first task today, don't update streak
  IF v_tasks_completed_today > 1 THEN
    RETURN;
  END IF;
  
  -- Get the most recent task completion before today
  SELECT DATE(completed_at) INTO v_last_completion
  FROM tasks
  WHERE user_id = p_user_id 
    AND completed = true
    AND DATE(completed_at) < v_today
  ORDER BY completed_at DESC
  LIMIT 1;
  
  -- Calculate new streak
  IF v_last_completion IS NULL THEN
    -- First task ever
    v_current_streak := 1;
  ELSIF v_last_completion = v_today - INTERVAL '1 day' THEN
    -- Consecutive day - increment streak
    v_current_streak := COALESCE(v_current_streak, 0) + 1;
  ELSIF v_last_completion < v_today - INTERVAL '1 day' THEN
    -- Streak broken - reset to 1
    v_current_streak := 1;
  ELSE
    -- Same day completion, maintain current streak
    RETURN;
  END IF;
  
  -- Update user record
  UPDATE users
  SET 
    current_streak = v_current_streak,
    longest_streak = GREATEST(COALESCE(longest_streak, 0), v_current_streak),
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to call streak update when a task is completed
CREATE OR REPLACE FUNCTION trigger_update_streaks()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update streak when task changes from incomplete to complete
  IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
    -- Set completed_at if not already set
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    END IF;
    
    -- Update the user's streak
    PERFORM update_user_streaks(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on tasks table
DROP TRIGGER IF EXISTS on_task_completed ON tasks;
CREATE TRIGGER on_task_completed
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_streaks();

-- Function to calculate streaks for all existing users based on historical data
-- This is a one-time function to set initial streak values
CREATE OR REPLACE FUNCTION calculate_all_user_streaks()
RETURNS void AS $$
DECLARE
  v_user RECORD;
  v_task_date DATE;
  v_prev_date DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_temp_streak INTEGER;
BEGIN
  -- Loop through all users
  FOR v_user IN SELECT id FROM users LOOP
    v_current_streak := 0;
    v_longest_streak := 0;
    v_temp_streak := 0;
    v_prev_date := NULL;
    
    -- Loop through user's completed tasks in chronological order
    FOR v_task_date IN 
      SELECT DISTINCT DATE(completed_at) as completion_date
      FROM tasks
      WHERE user_id = v_user.id 
        AND completed = true
        AND completed_at IS NOT NULL
      ORDER BY completion_date
    LOOP
      IF v_prev_date IS NULL THEN
        -- First task
        v_temp_streak := 1;
      ELSIF v_task_date = v_prev_date + INTERVAL '1 day' THEN
        -- Consecutive day
        v_temp_streak := v_temp_streak + 1;
      ELSE
        -- Streak broken
        v_longest_streak := GREATEST(v_longest_streak, v_temp_streak);
        v_temp_streak := 1;
      END IF;
      
      v_prev_date := v_task_date;
    END LOOP;
    
    -- Final check for longest streak
    v_longest_streak := GREATEST(v_longest_streak, v_temp_streak);
    
    -- Check if the streak is still active (last completion was yesterday or today)
    IF v_prev_date >= CURRENT_DATE - INTERVAL '1 day' THEN
      v_current_streak := v_temp_streak;
    ELSE
      v_current_streak := 0;
    END IF;
    
    -- Update user's streak values
    UPDATE users
    SET 
      current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      updated_at = NOW()
    WHERE id = v_user.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset streak if user hasn't completed tasks
-- This should be called daily via a cron job
CREATE OR REPLACE FUNCTION reset_broken_streaks()
RETURNS void AS $$
BEGIN
  -- Reset streaks for users who didn't complete any tasks yesterday
  UPDATE users u
  SET 
    current_streak = 0,
    updated_at = NOW()
  WHERE current_streak > 0
    AND NOT EXISTS (
      SELECT 1 
      FROM tasks t
      WHERE t.user_id = u.id
        AND t.completed = true
        AND DATE(t.completed_at) = CURRENT_DATE - INTERVAL '1 day'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_user_streaks(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_all_user_streaks() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_broken_streaks() TO authenticated;

-- Run initial calculation for existing users
SELECT calculate_all_user_streaks();

-- Add comment to document the streak system
COMMENT ON FUNCTION update_user_streaks IS 'Updates user streak when first task of the day is completed';
COMMENT ON FUNCTION trigger_update_streaks IS 'Trigger function that calls update_user_streaks when task is marked complete';
COMMENT ON FUNCTION calculate_all_user_streaks IS 'One-time function to calculate streaks based on historical data';
COMMENT ON FUNCTION reset_broken_streaks IS 'Daily cron job function to reset broken streaks';