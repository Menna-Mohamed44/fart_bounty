-- Trigger to automatically create user profile when user signs up through Supabase Auth
-- This runs on the auth.users table (not public.users)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_username text;
  user_display_name text;
BEGIN
  -- Extract username and display_name from user metadata
  user_username := NEW.raw_user_meta_data->>'username';
  user_display_name := NEW.raw_user_meta_data->>'display_name';

  -- Ensure username is provided and valid
  IF user_username IS NULL OR user_username = '' THEN
    user_username := 'user_' || substr(NEW.id::text, 1, 8);
  END IF;

  -- Ensure display_name is provided and valid
  IF user_display_name IS NULL OR user_display_name = '' THEN
    user_display_name := split_part(NEW.email, '@', 1);
  END IF;

  -- Insert into public.users table when a new user signs up
  INSERT INTO public.users (id, username, display_name)
  VALUES (
    NEW.id,
    user_username,
    user_display_name
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.users TO anon, authenticated, service_role;
