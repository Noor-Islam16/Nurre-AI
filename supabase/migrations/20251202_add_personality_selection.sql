-- Migration: Add Personality Selection to Users Table
-- Date: 2025-12-02
-- Description: Adds selected_personality column for multi-avatar voice system
-- Personalities: nur (energetic), farin (supportive), zak (calm/logical)
-- COMPLETED: 2025-12-02 - Run successfully on production

-- =============================================================================
-- 1. ADD PERSONALITY SELECTION COLUMN
-- =============================================================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS selected_personality TEXT
  DEFAULT 'nur'
  CHECK (selected_personality IN ('nur', 'farin', 'zak'));

-- =============================================================================
-- 2. CREATE INDEX FOR PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_users_selected_personality
ON users(selected_personality);

-- =============================================================================
-- 3. ADD DOCUMENTATION
-- =============================================================================
COMMENT ON COLUMN users.selected_personality IS
  'User selected AI personality for voice coaching: nur (energetic hype friend), farin (supportive big sister), zak (calm logical guide)';

-- =============================================================================
-- 4. VERIFICATION
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'selected_personality'
  ) THEN
    RAISE EXCEPTION 'Migration failed: Column selected_personality was not created';
  END IF;

  RAISE NOTICE 'Migration successful: selected_personality column added to users table with default "nur"';
END $$;
