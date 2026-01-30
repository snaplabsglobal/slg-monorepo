-- ============================================================================
-- Create Organization for Existing Users
-- ============================================================================
-- Purpose: Create organizations for users who don't have one yet
-- Usage: Execute this script in Supabase Dashboard SQL Editor
-- ============================================================================

-- Option 1: Create organization for a specific user by email
-- Replace 'YOUR_EMAIL@example.com' with the actual email address
DO $$ 
DECLARE
  v_user_id UUID;
  v_user_email TEXT := 'YOUR_EMAIL@example.com'; -- Replace with your email
  v_org_id UUID;
  v_org_exists BOOLEAN;
BEGIN
  -- Find user by email
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users 
  WHERE email = v_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', v_user_email;
  END IF;
  
  RAISE NOTICE 'Found user: % (%)', v_user_email, v_user_id;
  
  -- Check if user already has an organization
  SELECT EXISTS(
    SELECT 1 FROM organization_members 
    WHERE user_id = v_user_id
  ) INTO v_org_exists;
  
  IF v_org_exists THEN
    RAISE NOTICE 'User already has an organization';
    
    -- Show existing organization
    SELECT o.id INTO v_org_id
    FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = v_user_id
    LIMIT 1;
    
    RAISE NOTICE 'Existing organization ID: %', v_org_id;
  ELSE
    -- Create organization using the helper function
    SELECT create_user_organization(v_user_id) INTO v_org_id;
    
    RAISE NOTICE 'Created organization: %', v_org_id;
  END IF;
  
  -- Display result
  RAISE NOTICE '=================================';
  RAISE NOTICE 'Setup complete!';
  RAISE NOTICE 'User: % (%)', v_user_email, v_user_id;
  RAISE NOTICE 'Organization ID: %', v_org_id;
  RAISE NOTICE '=================================';
END $$;

-- Option 2: Create organizations for ALL users who don't have one
-- Uncomment the following block to run for all users
/*
DO $$ 
DECLARE
  v_user_record RECORD;
  v_org_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Loop through all users who don't have an organization
  FOR v_user_record IN
    SELECT u.id, u.email
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = u.id
    )
  LOOP
    -- Create organization using the helper function
    SELECT create_user_organization(v_user_record.id) INTO v_org_id;
    
    RAISE NOTICE 'Created organization for user: % (%)', v_user_record.email, v_user_record.id;
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE '=================================';
  RAISE NOTICE 'Created organizations for % users', v_count;
  RAISE NOTICE '=================================';
END $$;
*/

-- Verification query: Check all users and their organizations
SELECT 
  u.email,
  u.id as user_id,
  o.id as org_id,
  o.name as org_name,
  om.role
FROM auth.users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
ORDER BY u.email;
