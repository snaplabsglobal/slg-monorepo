-- ============================================================================
-- Fix User Creation Trigger Error
-- ============================================================================
-- The create_default_subscription_tier() trigger is failing because it
-- can't find the user_subscription_tiers table. This migration fixes the
-- trigger to handle errors gracefully and use the correct schema.
-- ============================================================================

-- Drop and recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION create_default_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the table exists before trying to insert
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_subscription_tiers'
  ) THEN
    -- Use fully qualified table name and handle errors gracefully
    BEGIN
      INSERT INTO public.user_subscription_tiers (user_id, tier_name, status)
      VALUES (NEW.id, 'home_hero', 'active')
      ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't fail the user creation
      RAISE WARNING 'Failed to create default subscription tier for user %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_default_subscription_tier() IS 'Creates a default Home Hero subscription tier for new users. Fails gracefully if table does not exist.';

-- Ensure the trigger exists (it should already exist, but this ensures it's correct)
DROP TRIGGER IF EXISTS trigger_create_default_tier ON auth.users;
CREATE TRIGGER trigger_create_default_tier
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription_tier();
