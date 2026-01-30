-- ============================================================================
-- Create Organizations for Existing Users
-- ============================================================================
-- Purpose: Automatically create organizations for all existing users who don't
--          have one yet. Uses the create_user_organization() helper function.
-- ============================================================================

DO $$ 
DECLARE
  v_user_record RECORD;
  v_org_id UUID;
  v_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  -- Loop through all users who don't have an organization
  FOR v_user_record IN
    SELECT u.id, u.email
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = u.id
    )
    ORDER BY u.created_at
  LOOP
    BEGIN
      -- Create organization using the helper function
      -- This function handles:
      -- - Creating the organization
      -- - Adding user as Owner
      -- - Setting default plan and metadata
      SELECT create_user_organization(v_user_record.id) INTO v_org_id;
      
      RAISE NOTICE 'Created organization for user: % (%) -> Org ID: %', 
        v_user_record.email, 
        v_user_record.id, 
        v_org_id;
      
      v_count := v_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue with other users
        RAISE WARNING 'Failed to create organization for user % (%): %', 
          v_user_record.email, 
          v_user_record.id, 
          SQLERRM;
        v_skipped_count := v_skipped_count + 1;
    END;
  END LOOP;
  
  -- Summary
  RAISE NOTICE '=================================';
  RAISE NOTICE 'Organization creation complete!';
  RAISE NOTICE 'Created: % organizations', v_count;
  IF v_skipped_count > 0 THEN
    RAISE NOTICE 'Skipped: % users (errors)', v_skipped_count;
  END IF;
  RAISE NOTICE '=================================';
END $$;

-- Verification: Show all users and their organizations
-- This query helps verify that organizations were created successfully
DO $$
DECLARE
  v_total_users INTEGER;
  v_users_with_org INTEGER;
  v_users_without_org INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_users FROM auth.users;
  
  SELECT COUNT(DISTINCT om.user_id) INTO v_users_with_org
  FROM organization_members om;
  
  v_users_without_org := v_total_users - v_users_with_org;
  
  RAISE NOTICE '=================================';
  RAISE NOTICE 'Verification Summary:';
  RAISE NOTICE 'Total users: %', v_total_users;
  RAISE NOTICE 'Users with organization: %', v_users_with_org;
  RAISE NOTICE 'Users without organization: %', v_users_without_org;
  RAISE NOTICE '=================================';
END $$;
