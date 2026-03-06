-- Migration: 023_fix_existing_users_names.sql
-- Date: 2025-08-19
-- Status: COMPLETED
-- Purpose: Fix existing users without names
-- Changes:
--   - Extracts username from email for users without names
--   - Attempts to get name from auth metadata
--   - Ensures all users have at least a display name

-- Update existing users who have no name or empty name
-- Extract username part from email (before @ symbol) as a fallback
UPDATE public.users
SET 
  name = CASE 
    WHEN name IS NULL OR name = '' THEN 
      SPLIT_PART(email, '@', 1)
    ELSE 
      name
  END,
  updated_at = NOW()
WHERE name IS NULL OR name = '';

-- Also try to get name from auth metadata for existing users
UPDATE public.users u
SET 
  name = COALESCE(
    auth.users.raw_user_meta_data->>'name',
    auth.users.raw_user_meta_data->>'display_name',
    auth.users.raw_user_meta_data->>'full_name',
    u.name
  ),
  updated_at = NOW()
FROM auth.users
WHERE u.id = auth.users.id
  AND (u.name IS NULL OR u.name = '')
  AND auth.users.raw_user_meta_data IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.users.name IS 'User display name - set during signup or onboarding';