-- Migration: 022_auto_create_user_profile.sql
-- Date: 2025-08-19
-- Status: COMPLETED
-- Purpose: Ensures user profile is created automatically when user signs up
-- Changes:
--   - Creates trigger function to auto-create user profile on auth signup
--   - Copies name from auth metadata to users table
--   - Handles updates to user metadata (name changes)
--   - Sets default values for all required fields per database schema

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert user profile with name from metadata
  -- Include all required fields from the users table schema
  INSERT INTO public.users (
    id,
    email,
    name,
    adhd_persona,
    current_streak,
    longest_streak,
    onboarding_completed,
    first_login_after_onboarding,
    is_deleted,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      ''
    ),
    'balanced', -- Default ADHD persona
    0, -- current_streak
    0, -- longest_streak
    FALSE, -- onboarding_completed
    FALSE, -- first_login_after_onboarding
    FALSE, -- is_deleted
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    name = COALESCE(EXCLUDED.name, users.name),
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN new;
END;
$$;

-- Create trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also handle user metadata updates (e.g., when user updates their name)
CREATE OR REPLACE FUNCTION public.handle_user_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update name if it's in metadata and different
  UPDATE public.users
  SET 
    name = COALESCE(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'display_name',
      name
    ),
    updated_at = NOW()
  WHERE id = new.id
    AND (
      name IS NULL 
      OR name = ''
      OR name != COALESCE(new.raw_user_meta_data->>'name', name)
    );
  
  RETURN new;
END;
$$;

-- Create trigger for user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_updated();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user profile when new auth user is created, copying name from metadata';
COMMENT ON FUNCTION public.handle_user_updated() IS 'Updates user profile when auth user metadata is updated';