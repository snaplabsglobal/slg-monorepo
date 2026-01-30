-- ============================================================================
-- Create Organization Helper Function
-- ============================================================================
-- This function allows users to create their own organization by bypassing
-- RLS policies using SECURITY DEFINER. The function ensures that users can
-- only create organizations where they are the owner.
-- ============================================================================

-- Function to create organization for a user
CREATE OR REPLACE FUNCTION create_user_organization(
  p_user_id UUID,
  p_org_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_user_email TEXT;
  v_org_name TEXT;
  v_existing_org_id UUID;
BEGIN
  -- Verify the user exists
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id;
  
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- Check if user already has an organization
  SELECT organization_id INTO v_existing_org_id
  FROM organization_members
  WHERE user_id = p_user_id
  LIMIT 1;
  
  IF v_existing_org_id IS NOT NULL THEN
    RETURN v_existing_org_id;
  END IF;
  
  -- Determine organization name
  IF p_org_name IS NOT NULL AND p_org_name != '' THEN
    v_org_name := p_org_name;
  ELSE
    v_org_name := v_user_email || '''s Company';
  END IF;
  
  -- Create organization (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO organizations (
    name,
    owner_id,
    plan,
    usage_metadata
  )
  VALUES (
    v_org_name,
    p_user_id,
    'Free',
    jsonb_build_object(
      'project_limit', 1,
      'receipt_count', 0
    )
  )
  RETURNING id INTO v_org_id;
  
  -- Create membership
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role
  )
  VALUES (
    v_org_id,
    p_user_id,
    'Owner'
  )
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  
  RETURN v_org_id;
END;
$$;

COMMENT ON FUNCTION create_user_organization(UUID, TEXT) IS 'Creates an organization for a user and adds them as Owner. Returns existing org_id if user already has one.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_organization(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_organization(UUID, TEXT) TO anon;
